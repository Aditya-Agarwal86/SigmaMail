"use client";

import React from "react";
import { 
  FileText, 
  FileSpreadsheet, 
  Presentation, 
  Image as ImageIcon, 
  Download, 
  File, 
  ExternalLink,
  Paperclip
} from "lucide-react";
import { AttachmentInfo } from "@/lib/email-sanitizer";

interface EmailAttachmentsListProps {
  attachments: AttachmentInfo[];
}

export function EmailAttachmentsList({ attachments }: EmailAttachmentsListProps) {
  if (!attachments || attachments.length === 0) return null;

  const getFileIcon = (type: string, name: string) => {
    const ext = (name.split(".").pop() || type).toLowerCase();
    switch (ext) {
      case "pdf":
        return <FileText className="h-5 w-5 text-rose-500" />;
      case "xls":
      case "xlsx":
      case "csv":
        return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
      case "ppt":
      case "pptx":
        return <Presentation className="h-5 w-5 text-amber-500" />;
      case "png":
      case "jpg":
      case "jpeg":
        return <ImageIcon className="h-5 w-5 text-sky-500" />;
      default:
        return <File className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="border-t border-border bg-muted/10 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Paperclip className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
          Attachments ({attachments.length})
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {attachments.map((file, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-3 rounded-xl bg-card border border-border shadow-2xs hover:border-primary/40 transition-colors group"
          >
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="p-2 rounded-lg bg-muted shrink-0 group-hover:bg-primary/10 transition-colors">
                {getFileIcon(file.type, file.name)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate" title={file.name}>
                  {file.name}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="uppercase font-medium">{file.type}</span>
                  {file.size && <span>• {file.size}</span>}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                // In production or demo, trigger download or open preview
                window.alert(`Opening document: ${file.name}`);
              }}
              title={`Download ${file.name}`}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 transition-colors"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
