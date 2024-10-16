import asciidoctor, { AbstractBlock, Document } from 'asciidoctor'
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import slug from 'slug';

// Read original file
const Asciidoctor = asciidoctor();
const originalFile = process.argv[2];
if (!originalFile) {
    console.log("Please provide the AsciiDoc file to be splitted (as first argument)!")
    process.exit(1)
}
const doc = Asciidoctor.loadFile(originalFile, {
    sourcemap: true,
});


// Split sections into files
const parts = splitIntoParts(doc);
for (const part of parts) {
    // Fix references
    const transformedContent = part.content.replace(/<<(.+?)(, *(.+?) *)?>>/g, (wholeMatch, ref, _, label) => {
        const referencedPart = parts.find((p) => p.refs.has(ref));
        if (!referencedPart) {
            throw new Error(`Couldn't find reference ${ref}`);
        }
        if (referencedPart.name === part.name) {
            return wholeMatch;
        } else {
            return `xref:${referencedPart.path}#${ref}[${label ?? ""}]`;
        }
    });
    // console.log(transformedContent);
    // Write file
    const completePath = `target/pages/${part.path}`;
    fs.mkdirSync(path.dirname(completePath), {recursive: true});
    fs.writeFileSync(completePath, transformedContent);
}
// Write nav file
const navFileContent = parts.map(p => `${"*".repeat(p.parentSections.length + 1)} xref:${p.path}[]`).join("\n");
fs.writeFileSync(`target/nav.adoc`, navFileContent);

function splitIntoParts(doc: Document): Part[] {
    const parts: Part[] = [];
    const sourceLines = doc.getSourceLines();
    for (const s of getSections(doc, [], 0)) {
        // Extract part content
        const lines = sourceLines.slice(s.startLine, s.endLine || undefined);
        for (var i = 0; i < lines.length; i++) {
            var l = lines[i];
            // Reduce heading levels by 1
            for (var j = 0; j <= s.parentSections.length; j++) {
                l = l.replace(/^=(=+ .*)/, "$1");
            }
            lines[i] = l;
        }
        const partContent = lines.join("\n");
        // Read refs
        const partDoc = Asciidoctor.load(partContent);
        const refs = new Set(Object.keys(partDoc.getRefs()));
        // Create part
        const basePath = s.parentSections.length === 0 ? "" : s.parentSections.join("/") + "/";
        const path = `${basePath}${s.name}.adoc`;
        const part = {
            name: s.name,
            parentSections: s.parentSections,
            path,
            content: lines.join("\n"),
            refs,
        }
        parts.push(part);

    }
    return parts;
}

// Extracts all sections from the given block
function getSections(block: AbstractBlock, parentSections: string[], splitCountdown: number): Section[] {
    const sections: Section[] = [];
    for (const s of block.getSections()) {
        const symbolicSectionName = slug(s.getName());
        const section: Section = {
            name: symbolicSectionName,
            parentSections,
            startLine: s.getSourceLocation().getLineNumber()! - 2,
            endLine: null,
        };
        sections.push(section);
        const splitAttribute = s.getAttribute("split");
        const effectiveSplitCountdown = splitAttribute ? parseInt(splitAttribute) : splitCountdown;
        if (effectiveSplitCountdown > 0) {
            // Section is annotated with [%split]. Split it into multiple sub sections.
            const subSections = getSections(s, [...parentSections, symbolicSectionName], effectiveSplitCountdown - 1);
            sections.push(...subSections);
        }
    }
    var lastLineNumber: number | null = null;
    for (var i = 0; i < sections.length; i++) {
        const s = sections[sections.length - i - 1];
        s.endLine = lastLineNumber;
        lastLineNumber = s.startLine;
    }
    return sections as Section[];
}

type Section = {
    name: string,
    parentSections: string[],
    startLine: number,
    endLine: number | null,
}

type Part = {
    name: string,
    parentSections: string[],
    path: string,
    content: string,
    refs: Set<string>,
}