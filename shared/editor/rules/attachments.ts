import MarkdownIt from "markdown-it";
import Token from "markdown-it/lib/token";

function isParagraph(token: Token) {
  return token.type === "paragraph_open";
}

function isInline(token: Token) {
  return token.type === "inline";
}

function isLinkOpen(token: Token) {
  return token.type === "link_open";
}

function isLinkClose(token: Token) {
  return token.type === "link_close";
}

function isAttachment(token: Token) {
  const href = token.attrGet("href");
  return href?.includes("attachments.redirect");
}

export default function linksToAttachments(md: MarkdownIt) {
  md.core.ruler.after("inline", "attachments", (state) => {
    const tokens = state.tokens;
    let insideLink;

    for (let i = 0; i < tokens.length - 1; i++) {
      // once we find an inline token look through it's children for links
      if (isInline(tokens[i]) && isParagraph(tokens[i - 1])) {
        const tokenChildren = tokens[i].children || [];

        for (let j = 0; j < tokenChildren.length - 1; j++) {
          const current = tokenChildren[j];
          if (!current) continue;

          if (isLinkOpen(current)) {
            insideLink = current;
            continue;
          }

          if (isLinkClose(current)) {
            insideLink = null;
            continue;
          }

          // of hey, we found a link – lets check to see if it should be
          // converted to a file attachment
          if (insideLink && isAttachment(insideLink)) {
            const { content } = current;

            // convert to embed token
            const token = new Token("attachment", "a", 0);
            token.attrSet("href", insideLink.attrGet("href") || "");

            const parts = content.split(" ");
            const size = parts.pop();
            const title = parts.join(" ");
            token.attrSet("size", size || "0");
            token.attrSet("title", title);

            // delete the inline link – this makes the assumption that the
            // embed is the only thing in the para.
            tokens.splice(i - 1, 3, token);
            insideLink = null;
            break;
          }
        }
      }
    }

    return false;
  });
}
