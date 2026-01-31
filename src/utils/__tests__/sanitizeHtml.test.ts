import { describe, expect, it } from "vitest";

import { sanitizeHtml } from "../sanitizeHtml";

describe("sanitizeHtml", () => {
  it("returns empty string for empty input", () => {
    expect(sanitizeHtml("")).toBe("");
  });

  it("preserves safe HTML", () => {
    const input = "<p>Hello <strong>world</strong></p>";
    const result = sanitizeHtml(input);
    expect(result).toContain("<p>");
    expect(result).toContain("<strong>");
    expect(result).toContain("Hello");
    expect(result).toContain("world");
  });

  it("removes script tags", () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<script>");
    // The text content is preserved but not executed (safe)
    expect(result).toContain("Hello");
  });

  it("removes style tags", () => {
    const input = "<p>Hello</p><style>body { display: none; }</style>";
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<style>");
    // Style tags are removed; text content may be preserved but won't be applied as CSS
  });

  it("removes iframe tags", () => {
    const input = '<p>Hello</p><iframe src="https://evil.com"></iframe>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<iframe>");
    expect(result).not.toContain("evil.com");
  });

  it("removes object tags", () => {
    const input = '<p>Hello</p><object data="malware.swf"></object>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<object>");
    expect(result).not.toContain("malware.swf");
  });

  it("removes embed tags", () => {
    const input = '<p>Hello</p><embed src="malware.swf">';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<embed>");
  });

  it("removes link tags", () => {
    const input = '<p>Hello</p><link rel="stylesheet" href="evil.css">';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<link>");
  });

  it("removes meta tags", () => {
    const input = '<p>Hello</p><meta http-equiv="refresh" content="0;url=evil.com">';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<meta>");
  });

  it("removes form tags (phishing risk)", () => {
    const input = '<p>Hello</p><form action="https://evil.com"><input name="password"></form>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<form>");
    expect(result).not.toContain("evil.com");
  });

  it("removes base tags (URL hijacking risk)", () => {
    const input = '<p>Hello</p><base href="https://evil.com/">';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<base>");
  });

  it("removes noscript tags", () => {
    const input = '<p>Hello</p><noscript><img src="tracking.gif"></noscript>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<noscript>");
  });

  it("removes event handler attributes", () => {
    const input = '<p onclick="alert(1)">Click me</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("onclick");
    expect(result).toContain("Click me");
  });

  it("removes various event handlers", () => {
    const handlers = [
      '<img onerror="alert(1)" src="x">',
      '<body onload="alert(1)">',
      '<div onmouseover="alert(1)">hover</div>',
      '<input onfocus="alert(1)">',
    ];
    handlers.forEach((input) => {
      const result = sanitizeHtml(input);
      expect(result).not.toMatch(/on\w+=/i);
    });
  });

  it("removes style attributes", () => {
    const input = '<p style="color: red;">Hello</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("style=");
    expect(result).toContain("Hello");
  });

  it("removes javascript: URLs from href", () => {
    const input = '<a href="javascript:alert(1)">Click</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("javascript:");
  });

  it("removes javascript: URLs from src", () => {
    const input = '<img src="javascript:alert(1)">';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("javascript:");
  });

  it("removes data: URLs", () => {
    const input = '<a href="data:text/html,<script>alert(1)</script>">Click</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("data:");
  });

  it("removes vbscript: URLs", () => {
    const input = '<a href="vbscript:msgbox(1)">Click</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("vbscript:");
  });

  it("allows safe http URLs", () => {
    const input = '<a href="http://example.com">Link</a>';
    const result = sanitizeHtml(input);
    expect(result).toContain('href="http://example.com"');
  });

  it("allows safe https URLs", () => {
    const input = '<a href="https://example.com">Link</a>';
    const result = sanitizeHtml(input);
    expect(result).toContain('href="https://example.com"');
  });

  it("allows mailto URLs", () => {
    const input = '<a href="mailto:test@example.com">Email</a>';
    const result = sanitizeHtml(input);
    expect(result).toContain('href="mailto:test@example.com"');
  });

  it("allows tel URLs", () => {
    const input = '<a href="tel:+1234567890">Call</a>';
    const result = sanitizeHtml(input);
    expect(result).toContain('href="tel:+1234567890"');
  });

  it("adds noopener and noreferrer to target=_blank links", () => {
    const input = '<a href="https://example.com" target="_blank">Link</a>';
    const result = sanitizeHtml(input);
    expect(result).toContain("noopener");
    expect(result).toContain("noreferrer");
  });

  it("preserves existing rel values when adding noopener/noreferrer", () => {
    const input =
      '<a href="https://example.com" target="_blank" rel="external">Link</a>';
    const result = sanitizeHtml(input);
    expect(result).toContain("external");
    expect(result).toContain("noopener");
    expect(result).toContain("noreferrer");
  });

  it("does not add noopener/noreferrer to non-blank targets", () => {
    const input = '<a href="https://example.com" target="_self">Link</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("noopener");
    expect(result).not.toContain("noreferrer");
  });

  it("handles nested dangerous content", () => {
    const input =
      '<div><p><script>alert(1)</script></p><span onclick="evil()">text</span></div>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("onclick");
    expect(result).toContain("text");
  });

  // XSS vector tests - SVG, MathML, and other attack vectors
  describe("XSS prevention - allowlist enforcement", () => {
    it("removes SVG tags (can contain script/event handlers)", () => {
      const input = '<svg onload="alert(1)"><circle r="50"></circle></svg>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<svg");
      expect(result).not.toContain("onload");
      expect(result).not.toContain("<circle");
    });

    it("removes SVG with embedded script", () => {
      const input = '<svg><script>alert(1)</script></svg>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<svg");
      expect(result).not.toContain("<script>");
      // Text content preserved but script won't execute
    });

    it("removes SVG foreignObject (can embed HTML)", () => {
      const input =
        '<svg><foreignObject><body onload="alert(1)"></body></foreignObject></svg>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<svg");
      expect(result).not.toContain("foreignObject");
      expect(result).not.toContain("onload");
    });

    it("removes MathML tags", () => {
      const input = '<math><maction actiontype="statusline">Click</maction></math>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<math");
      expect(result).not.toContain("<maction");
    });

    it("removes MathML with embedded script", () => {
      const input = '<math><mtext><script>alert(1)</script></mtext></math>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<math");
      expect(result).not.toContain("<script>");
    });

    it("removes srcdoc attribute (can embed arbitrary HTML)", () => {
      const input =
        '<iframe srcdoc="<script>alert(1)</script>"></iframe>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("srcdoc");
      expect(result).not.toContain("<iframe");
    });

    it("removes formaction attribute (can redirect form submission)", () => {
      const input =
        '<button formaction="https://evil.com/steal">Submit</button>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("formaction");
      expect(result).not.toContain("evil.com");
    });

    it("removes formmethod attribute", () => {
      const input = '<input type="submit" formmethod="POST" formaction="https://evil.com">';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("formmethod");
      expect(result).not.toContain("formaction");
    });

    it("removes poster attribute with javascript URL", () => {
      const input = '<video poster="javascript:alert(1)"></video>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<video");
      expect(result).not.toContain("poster");
    });

    it("removes background attribute", () => {
      const input = '<table background="javascript:alert(1)"><tr><td>data</td></tr></table>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("background=");
    });

    it("removes xlink:href attribute", () => {
      const input = '<svg><a xlink:href="javascript:alert(1)">click</a></svg>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("xlink:href");
      expect(result).not.toContain("<svg");
    });

    it("removes template tags (can be used for DOM clobbering)", () => {
      const input = '<template><script>alert(1)</script></template>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<template");
      expect(result).not.toContain("<script>");
    });

    it("removes use tag (SVG external reference)", () => {
      const input = '<svg><use href="https://evil.com/sprite.svg#icon"></use></svg>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<use");
      expect(result).not.toContain("<svg");
    });

    it("removes animate tag (SVG animation can trigger events)", () => {
      const input =
        '<svg><animate onbegin="alert(1)" attributeName="x" from="0" to="100"></animate></svg>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<animate");
      expect(result).not.toContain("onbegin");
    });

    it("removes set tag (SVG)", () => {
      const input = '<svg><set onbegin="alert(1)" attributeName="fill" to="red"></set></svg>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<set");
      expect(result).not.toContain("onbegin");
    });

    it("removes audio tag with autoplay", () => {
      const input = '<audio src="x" onerror="alert(1)" autoplay></audio>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<audio");
      expect(result).not.toContain("onerror");
    });

    it("removes video tag", () => {
      const input = '<video src="x" onerror="alert(1)"></video>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<video");
      expect(result).not.toContain("onerror");
    });

    it("removes source tag", () => {
      const input = '<video><source src="x" onerror="alert(1)"></video>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<source");
      expect(result).not.toContain("<video");
    });

    it("removes track tag", () => {
      const input = '<video><track src="x" onerror="alert(1)"></video>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<track");
    });

    it("removes input tags (form elements)", () => {
      const input = '<input type="text" onfocus="alert(1)" autofocus>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<input");
      expect(result).not.toContain("onfocus");
    });

    it("removes textarea tags", () => {
      const input = '<textarea onfocus="alert(1)" autofocus></textarea>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<textarea");
    });

    it("removes select tags", () => {
      const input = '<select onfocus="alert(1)"><option>x</option></select>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<select");
    });

    it("removes button tags", () => {
      const input = '<button onclick="alert(1)">Click</button>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<button");
      expect(result).not.toContain("onclick");
    });

    it("removes marquee tag", () => {
      const input = '<marquee onstart="alert(1)">scrolling text</marquee>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<marquee");
    });

    it("removes keygen tag", () => {
      const input = '<keygen autofocus onfocus="alert(1)">';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<keygen");
    });

    it("removes applet tag", () => {
      const input = '<applet code="evil.class"></applet>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<applet");
    });

    it("removes bgsound tag", () => {
      const input = '<bgsound src="evil.mp3">';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<bgsound");
    });

    it("removes body tag with event handlers", () => {
      const input = '<body onload="alert(1)"><p>content</p></body>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("onload");
      expect(result).toContain("content");
    });
  });

  describe("preserves allowed content", () => {
    it("preserves basic formatting tags", () => {
      const input = "<p><strong>Bold</strong> and <em>italic</em></p>";
      const result = sanitizeHtml(input);
      expect(result).toContain("<p>");
      expect(result).toContain("<strong>");
      expect(result).toContain("<em>");
      expect(result).toContain("Bold");
      expect(result).toContain("italic");
    });

    it("preserves lists", () => {
      const input = "<ul><li>Item 1</li><li>Item 2</li></ul>";
      const result = sanitizeHtml(input);
      expect(result).toContain("<ul>");
      expect(result).toContain("<li>");
    });

    it("preserves tables", () => {
      const input =
        "<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Data</td></tr></tbody></table>";
      const result = sanitizeHtml(input);
      expect(result).toContain("<table>");
      expect(result).toContain("<thead>");
      expect(result).toContain("<tbody>");
      expect(result).toContain("<tr>");
      expect(result).toContain("<th>");
      expect(result).toContain("<td>");
    });

    it("preserves headings", () => {
      const input = "<h1>Title</h1><h2>Subtitle</h2>";
      const result = sanitizeHtml(input);
      expect(result).toContain("<h1>");
      expect(result).toContain("<h2>");
    });

    it("preserves code blocks", () => {
      const input = "<pre><code>const x = 1;</code></pre>";
      const result = sanitizeHtml(input);
      expect(result).toContain("<pre>");
      expect(result).toContain("<code>");
    });

    it("preserves blockquotes", () => {
      const input = '<blockquote cite="https://example.com">Quote</blockquote>';
      const result = sanitizeHtml(input);
      expect(result).toContain("<blockquote");
      expect(result).toContain('cite="https://example.com"');
    });

    it("preserves safe image tags", () => {
      const input = '<img src="https://example.com/img.png" alt="description">';
      const result = sanitizeHtml(input);
      expect(result).toContain("<img");
      expect(result).toContain('src="https://example.com/img.png"');
      expect(result).toContain('alt="description"');
    });

    it("preserves data attributes", () => {
      const input = '<div data-testid="test" data-custom="value">content</div>';
      const result = sanitizeHtml(input);
      expect(result).toContain('data-testid="test"');
      expect(result).toContain('data-custom="value"');
    });

    it("preserves ARIA attributes", () => {
      const input =
        '<div role="button" aria-label="Click me" aria-hidden="false">button</div>';
      const result = sanitizeHtml(input);
      expect(result).toContain('role="button"');
      expect(result).toContain('aria-label="Click me"');
    });

    it("preserves class and id attributes", () => {
      const input = '<p id="intro" class="text-large">Paragraph</p>';
      const result = sanitizeHtml(input);
      expect(result).toContain('id="intro"');
      expect(result).toContain('class="text-large"');
    });

    it("preserves table colspan and rowspan", () => {
      const input = '<table><tr><td colspan="2" rowspan="3">cell</td></tr></table>';
      const result = sanitizeHtml(input);
      expect(result).toContain('colspan="2"');
      expect(result).toContain('rowspan="3"');
    });
  });
});
