"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { gsap } from "gsap";
import { useDropzone } from "react-dropzone";
import { HardDrive, Save, UploadCloud, FileSignature, Calendar, Info, CheckCircle2, File as FileIcon, X, Loader2 } from "lucide-react";
import { format } from "date-fns";

const InputField = ({ label, value, onChange, type = "text", placeholder = "" }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-sm font-medium text-muted-foreground">{label}</label>
    <input
      type={type}
      value={value || ""}
      onChange={onChange}
      placeholder={placeholder}
      className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    />
  </div>
);

export default function FileManipulator() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [passkey, setPasskey] = useState("");
  const loginRef = useRef<HTMLDivElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [readingFile, setReadingFile] = useState(false);
  const [success, setSuccess] = useState<{status: boolean, path: string}>({ status: false, path: "" });
  
  const [origin, setOrigin] = useState({
    authors: "",
    lastSavedBy: "",
    revisionNumber: "",
    versionNumber: "",
  });

  const [content, setContent] = useState({
    programName: "",
    company: "",
    manager: "",
  });

  const [fileTime, setFileTime] = useState({
    createdAt: "",
    modifiedAt: "",
    accessedAt: "",
  });

  useEffect(() => {
    if (isLoggedIn) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1, ease: "power4.out" }
      );
    } else {
      gsap.fromTo(
        loginRef.current,
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 1, ease: "back.out(1.7)" }
      );
    }
  }, [isLoggedIn]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      setSuccess({ status: false, path: "" });
      setReadingFile(true);
      
      const now = new Date();
      const lastModified = new Date(selectedFile.lastModified);
      
      let fetchedOrigin = { authors: "", lastSavedBy: "", revisionNumber: "", versionNumber: "" };
      let fetchedContent = { programName: "", company: "", manager: "" };

      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('action', 'read');

        const res = await fetch('/api/file', {
          method: 'POST',
          body: formData
        });
        
        const data = await res.json();
        if (data.success) {
          if (data.origin) fetchedOrigin = { ...fetchedOrigin, ...data.origin };
          if (data.content) fetchedContent = { ...fetchedContent, ...data.content };
        }
      } catch (e) {
        console.error("Failed to auto-fill metadata", e);
      }

      setOrigin(fetchedOrigin);
      setContent(fetchedContent);

      setFileTime({
        createdAt: format(now, "yyyy-MM-dd'T'HH:mm"),
        modifiedAt: format(lastModified, "yyyy-MM-dd'T'HH:mm"),
        accessedAt: format(now, "yyyy-MM-dd'T'HH:mm"),
      });

      setReadingFile(false);
      
      gsap.fromTo(
        formRef.current,
        { opacity: 0, height: 0, scale: 0.95 },
        { opacity: 1, height: "auto", scale: 1, duration: 0.8, ease: "power3.out" }
      );
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1
  });

  const handleSave = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify({
        fileTime, origin, content
      }));
      formData.append('action', 'update');

      const res = await fetch("/api/file", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        let errStr = "Error";
        try {
          const errBody = await res.json();
          errStr = errBody.error;
        } catch(e) {}
        alert("Failed to update file details: " + errStr);
      } else {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Edited_${file.name}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setSuccess({ status: true, path: "File has been downloaded successfully!" });
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const removeFile = () => {
    gsap.to(formRef.current, {
      opacity: 0, height: 0, scale: 0.95, duration: 0.5, ease: "power3.in",
      onComplete: () => {
        setFile(null);
        setSuccess({ status: false, path: "" });
      }
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passkey === "sigmaboy1") {
      gsap.to(loginRef.current, {
        opacity: 0, scale: 1.1, duration: 0.5, onComplete: () => setIsLoggedIn(true)
      });
    } else {
      alert("Unauthorized Access. Wrong Passkey.");
      setPasskey("");
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#09090b]">
        <div ref={loginRef} className="w-full max-w-md bg-black/40 backdrop-blur-3xl border border-white/10 p-8 rounded-3xl shadow-2xl space-y-8">
          <div className="text-center space-y-4">
             <div className="mx-auto w-20 h-20 bg-white/5 rounded-full border border-white/10 p-4 shadow-inner overflow-hidden">
                <img src="/epstein_logo.png" className="w-full h-full object-cover grayscale opacity-50" alt="Lock" />
             </div>
             <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">Identity Verification</h2>
             <p className="text-sm text-white/30">Welcome back, Soldier. Enter your passkey.</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
             <div className="space-y-2">
                <input 
                  type="password"
                  placeholder="Enter Passkey"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-center tracking-widest focus:border-blue-500/50 focus:outline-none transition-all duration-300"
                />
             </div>
             <button type="submit" className="w-full h-12 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-all shadow-xl shadow-white/5">
                ACCESS SYSTEM
             </button>
          </form>
          <div className="text-center pt-4">
            <span className="text-[10px] text-white/10 uppercase tracking-[0.2em]">Restricted Area &copy; 2026</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-6 lg:px-8 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />
      
      <div ref={containerRef} className="w-full max-w-4xl mx-auto space-y-8 z-10">
        
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-2xl mb-4 border border-white/10 shadow-xl backdrop-blur-md overflow-hidden relative w-16 h-16">
            <img src="/epstein_logo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent">
            Epstein Manipulator
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            The ultimate tool for precise metadata surgery and timestamp manipulation.
          </p>
        </div>

        {!file ? (
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all backdrop-blur-xl ${
              isDragActive ? 'border-blue-500 bg-blue-500/10 scale-105' : 'border-white/20 bg-black/40 hover:bg-white/5 hover:border-white/40'
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloud className={`w-16 h-16 mx-auto mb-4 transition-colors ${isDragActive ? 'text-blue-400' : 'text-white/40'}`} />
            <h3 className="text-xl font-semibold mb-2">Drop your file here</h3>
            <p className="text-muted-foreground">or click to browse files from your computer</p>
          </div>
        ) : (
          <div className="bg-black/40 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-4 shadow-2xl flex items-center justify-between">
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <FileIcon className="w-8 h-8 text-blue-400" />
              </div>
              <div className="truncate">
                <h3 className="font-semibold text-lg truncate">{file.name}</h3>
                <p className="text-sm text-white/50">{(file.size / 1024).toFixed(2)} KB</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {readingFile && <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
              <button disabled={readingFile} onClick={removeFile} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <div ref={formRef} className="opacity-0 h-0 overflow-hidden space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
                <FileSignature className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-semibold">Origin & Content</h2>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="Authors" value={origin.authors} onChange={(e: any) => setOrigin({ ...origin, authors: e.target.value })} />
                  <InputField label="Last saved by" value={origin.lastSavedBy} onChange={(e: any) => setOrigin({ ...origin, lastSavedBy: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="Revision number" value={origin.revisionNumber} onChange={(e: any) => setOrigin({ ...origin, revisionNumber: e.target.value })} />
                  <InputField label="Version number" value={origin.versionNumber} onChange={(e: any) => setOrigin({ ...origin, versionNumber: e.target.value })} />
                </div>
                <InputField label="Program name" value={content.programName} onChange={(e: any) => setContent({ ...content, programName: e.target.value })} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="Company" value={content.company} onChange={(e: any) => setContent({ ...content, company: e.target.value })} />
                  <InputField label="Manager" value={content.manager} onChange={(e: any) => setContent({ ...content, manager: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col">
              <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-semibold">File System Times</h2>
              </div>
              
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6 flex gap-3 text-sm text-blue-200">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <p>These custom dates will be securely applied to your resulting file.</p>
              </div>

              <div className="space-y-4 flex-1">
                <InputField 
                  type="datetime-local" 
                  label="Date Created" 
                  value={fileTime.createdAt} 
                  onChange={(e: any) => setFileTime({ ...fileTime, createdAt: e.target.value })} 
                />
                <InputField 
                  type="datetime-local" 
                  label="Date Modified" 
                  value={fileTime.modifiedAt} 
                  onChange={(e: any) => setFileTime({ ...fileTime, modifiedAt: e.target.value })} 
                />
                <InputField 
                  type="datetime-local" 
                  label="Date Accessed" 
                  value={fileTime.accessedAt} 
                  onChange={(e: any) => setFileTime({ ...fileTime, accessedAt: e.target.value })} 
                />
              </div>
            </div>
            
          </div>

          {success.status && (
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex gap-3 text-green-400">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-white">Modification Successful!</h4>
                  <p className="text-sm mt-1 text-green-200/70">{success.path}</p>
                </div>
              </div>

              {/* Windows Fixer Helper */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-blue-400">
                  <Info className="w-5 h-5" />
                  <h4 className="font-semibold italic">Want to fix "Date Created" in Windows Properties too?</h4>
                </div>
                <p className="text-xs text-blue-200/60 leading-relaxed">
                  Browsers protect your PC by resetting the "Date Created" on all downloads. 
                  To force Windows to show your custom date, copy the command below, open <b>PowerShell</b>, and paste it:
                </p>
                <div className="bg-black/60 rounded-lg p-3 font-mono text-[10px] break-all border border-white/5 relative group">
                  <code className="text-blue-300">
                    {`gci -LiteralPath "Edited_${file?.name}" | % { $_.CreationTime = '${fileTime.createdAt.replace('T', ' ')}'; $_.LastWriteTime = '${fileTime.modifiedAt.replace('T', ' ')}' }`}
                  </code>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`gci -LiteralPath "Edited_${file?.name}" | % { $_.CreationTime = '${fileTime.createdAt.replace('T', ' ')}'; $_.LastWriteTime = '${fileTime.modifiedAt.replace('T', ' ')}' }`);
                      alert("Command copied to clipboard!");
                    }}
                    className="absolute right-2 top-2 p-1.5 bg-white/5 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Save className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[10px] text-white/30 italic">Note: Make sure you are in the same folder as the downloaded file.</p>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2 pb-12">
            <button
              onClick={handleSave}
              disabled={loading || success.status || readingFile}
              className="relative overflow-hidden group h-12 px-8 bg-white hover:bg-gray-100 text-black rounded-lg font-semibold transition-all shadow-xl shadow-white/10 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <span>Manipulating file...</span>
              ) : success.status ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Success</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Apply Modifications</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
