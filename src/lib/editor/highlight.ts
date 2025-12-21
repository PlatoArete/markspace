import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

export const markdownHighlighting = HighlightStyle.define([
    {
        tag: t.heading,
        fontWeight: "bold",
        color: "var(--text-primary)", // Keep headings neutral but bold
    },
    {
        tag: t.heading1,
        fontSize: "1.6em", // UI handles font size via CSS usually, but optional here
    },
    {
        tag: t.heading2,
        fontSize: "1.4em",
    },
    {
        tag: t.heading3,
        fontSize: "1.2em",
    },
    {
        tag: [t.atom, t.bool, t.url, t.contentSeparator, t.labelName],
        color: "var(--accent)",
    },
    {
        tag: [t.literal, t.inserted],
        color: "var(--text-primary)", // or accent?
    },
    {
        tag: [t.string, t.deleted],
        color: "var(--text-secondary)", // Dim deleted/strings?
    },
    {
        tag: [t.regexp, t.escape, t.special(t.string)],
        color: "var(--accent)",
    },
    {
        tag: t.definition(t.variableName),
        color: "var(--text-primary)",
    },
    {
        tag: t.local(t.variableName),
        color: "var(--text-primary)",
    },
    {
        tag: [t.typeName, t.namespace],
        color: "var(--text-primary)",
    },
    {
        tag: t.className,
        color: "var(--text-primary)",
    },
    {
        tag: [t.special(t.variableName), t.macroName],
        color: "var(--text-primary)",
    },
    {
        tag: t.comment,
        color: "var(--text-secondary)",
        fontStyle: "italic",
    },
    {
        tag: t.meta,
        color: "var(--text-secondary)",
    },
    {
        tag: t.strong,
        fontWeight: "bold",
        color: "var(--text-primary)", // Keep simple
    },
    {
        tag: t.emphasis,
        fontStyle: "italic",
        color: "var(--text-primary)",
    },
    {
        tag: t.strikethrough,
        textDecoration: "line-through",
        color: "var(--text-secondary)",
    },
    {
        tag: t.link,
        color: "var(--accent)",
        textDecoration: "underline",
    },
    {
        tag: [t.processingInstruction, t.inserted],
        color: "var(--accent)",
    },
]);

export const customSyntaxHighlighting = syntaxHighlighting(markdownHighlighting);
