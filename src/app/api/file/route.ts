import { NextResponse } from 'next/server';
import AdmZip from 'adm-zip';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    
    const file = formData.get('file') as File | null;
    const action = formData.get('action') as string;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // -----------------------------------------------------
    // ACTION: READ
    // -----------------------------------------------------
    if (action === 'read') {
      const isOfficeDoc = file.name.endsWith('.xlsx') || file.name.endsWith('.docx') || file.name.endsWith('.pptx');
      
      let origin = { authors: "", lastSavedBy: "", revisionNumber: "", versionNumber: "" };
      let content = { programName: "", company: "", manager: "" };

      if (isOfficeDoc) {
        try {
          const zip = new AdmZip(buffer);
          const zipEntries = zip.getEntries();
          
          let coreXmlEntry = zipEntries.find((e: any) => e.entryName === 'docProps/core.xml');
          let appXmlEntry = zipEntries.find((e: any) => e.entryName === 'docProps/app.xml');

          if (coreXmlEntry) {
            const coreXml = zip.readAsText(coreXmlEntry);
            const authorsMatch = coreXml.match(/<dc:creator>(.*?)<\/dc:creator>/);
            const lastSavedByMatch = coreXml.match(/<cp:lastModifiedBy>(.*?)<\/cp:lastModifiedBy>/);
            const revisionMatch = coreXml.match(/<cp:revision>(.*?)<\/cp:revision>/);
            
            if (authorsMatch) origin.authors = authorsMatch[1];
            if (lastSavedByMatch) origin.lastSavedBy = lastSavedByMatch[1];
            if (revisionMatch) origin.revisionNumber = revisionMatch[1];
          }

          if (appXmlEntry) {
            const appXml = zip.readAsText(appXmlEntry);
            const progMatch = appXml.match(/<Application>(.*?)<\/Application>/);
            const compMatch = appXml.match(/<Company>(.*?)<\/Company>/);
            const mgrMatch = appXml.match(/<Manager>(.*?)<\/Manager>/);
            const verMatch = appXml.match(/<AppVersion>(.*?)<\/AppVersion>/);
            
            if (progMatch) content.programName = progMatch[1];
            if (compMatch) content.company = compMatch[1];
            if (mgrMatch) content.manager = mgrMatch[1];
            if (verMatch) origin.versionNumber = verMatch[1];
          }
        } catch (e) {
          console.error("Failed to read zip metadata", e);
        }
      }

      return NextResponse.json({ success: true, origin, content });
    }

    // -----------------------------------------------------
    // ACTION: UPDATE
    // -----------------------------------------------------
    let finalBuffer = buffer;

    const metadataStr = formData.get('metadata') as string;
    const { origin, content, fileTime } = JSON.parse(metadataStr || '{}');
    const isOfficeDoc = file.name.endsWith('.xlsx') || file.name.endsWith('.docx') || file.name.endsWith('.pptx');
    
    if (isOfficeDoc) {
      try {
        const zip = new AdmZip(buffer);
        const zipEntries = zip.getEntries();
        
        let coreXmlEntry = zipEntries.find((e: any) => e.entryName === 'docProps/core.xml');
        let appXmlEntry = zipEntries.find((e: any) => e.entryName === 'docProps/app.xml');

        if (coreXmlEntry) {
          let coreXml = zip.readAsText(coreXmlEntry);
          
          // Update string fields
          if (origin.authors !== undefined) {
            coreXml = coreXml.replace(/<dc:creator>.*?<\/dc:creator>/g, `<dc:creator>${origin.authors}</dc:creator>`);
          }
          if (origin.lastSavedBy !== undefined) {
            coreXml = coreXml.replace(/<cp:lastModifiedBy>.*?<\/cp:lastModifiedBy>/g, `<cp:lastModifiedBy>${origin.lastSavedBy}</cp:lastModifiedBy>`);
          }
          if (origin.revisionNumber !== undefined) {
            coreXml = coreXml.replace(/<cp:revision>.*?<\/cp:revision>/g, `<cp:revision>${origin.revisionNumber}</cp:revision>`);
          }

          // INTERNAL TIMESTAMP INJECTION (This updates "Content Created" in Details tab)
          if (fileTime?.createdAt) {
               // format: 2026-04-27T22:07:00Z
               const dateStr = new Date(fileTime.createdAt).toISOString();
               if (coreXml.includes('<dcterms:created')) {
                   coreXml = coreXml.replace(/<dcterms:created.*?>.*?<\/dcterms:created>/g, `<dcterms:created xsi:type="dcterms:W3CDTF">${dateStr}</dcterms:created>`);
               } else {
                   coreXml = coreXml.replace('</cp:coreProperties>', `  <dcterms:created xsi:type="dcterms:W3CDTF">${dateStr}</dcterms:created>\n</cp:coreProperties>`);
               }
          }
          if (fileTime?.modifiedAt) {
               const dateStr = new Date(fileTime.modifiedAt).toISOString();
               if (coreXml.includes('<dcterms:modified')) {
                   coreXml = coreXml.replace(/<dcterms:modified.*?>.*?<\/dcterms:modified>/g, `<dcterms:modified xsi:type="dcterms:W3CDTF">${dateStr}</dcterms:modified>`);
               } else {
                   coreXml = coreXml.replace('</cp:coreProperties>', `  <dcterms:modified xsi:type="dcterms:W3CDTF">${dateStr}</dcterms:modified>\n</cp:coreProperties>`);
               }
          }

          zip.updateFile(coreXmlEntry, Buffer.from(coreXml, "utf8"));
        }

        if (appXmlEntry) {
          let appXml = zip.readAsText(appXmlEntry);
          if (content.programName !== undefined) {
            appXml = appXml.replace(/<Application>.*?<\/Application>/g, `<Application>${content.programName}</Application>`);
          }
          if (content.company !== undefined) {
            appXml = appXml.replace(/<Company>.*?<\/Company>/g, `<Company>${content.company}</Company>`);
          }
          if (content.manager !== undefined) {
            appXml = appXml.replace(/<Manager>.*?<\/Manager>/g, `<Manager>${content.manager}</Manager>`);
          }
          if (origin.versionNumber !== undefined) { 
            appXml = appXml.replace(/<AppVersion>.*?<\/AppVersion>/g, `<AppVersion>${origin.versionNumber}</AppVersion>`);
          }
          zip.updateFile(appXmlEntry, Buffer.from(appXml, "utf8"));
        }

        finalBuffer = zip.toBuffer();
      } catch (officeErr) {
        console.error("Failed to update Office metadata", officeErr);
      }
    }

    return new NextResponse(finalBuffer, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="Edited_${file.name}"`,
        'Content-Type': file.type || 'application/octet-stream',
      },
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
