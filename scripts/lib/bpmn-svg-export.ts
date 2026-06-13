/**
 * Puppeteer + bpmn-js Viewer로 BPMN XML을 SVG 문자열로 변환한다.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import puppeteer, { type Browser, type Page } from "puppeteer";

const BPMN_DIST = join(process.cwd(), "node_modules", "bpmn-js", "dist");

const buildExportHtml = (): string => {
  const distUrl = pathToFileURL(BPMN_DIST).href;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <link rel="stylesheet" href="${distUrl}/assets/diagram-js.css" />
    <link rel="stylesheet" href="${distUrl}/assets/bpmn-js.css" />
    <link rel="stylesheet" href="${distUrl}/assets/bpmn-font/css/bpmn-embedded.css" />
    <style>
      html, body { margin: 0; padding: 0; background: #fff; }
      #canvas { width: 8000px; height: 8000px; }
    </style>
  </head>
  <body>
    <div id="canvas"></div>
    <script src="${distUrl}/bpmn-viewer.production.min.js"></script>
    <script>
      window.exportBpmnSvg = async function (xml) {
        const viewer = new BpmnJS({ container: "#canvas" });
        try {
          const { warnings } = await viewer.importXML(xml);
          if (warnings && warnings.length) {
            console.warn("BPMN import warnings:", warnings);
          }
          const { svg } = await viewer.saveSVG();
          return svg;
        } finally {
          viewer.destroy();
        }
      };
    </script>
  </body>
</html>`;
};

let browserPromise: Promise<Browser> | null = null;
let exportPagePromise: Promise<Page> | null = null;

const getExportPage = async (): Promise<Page> => {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  if (!exportPagePromise) {
    exportPagePromise = (async () => {
      const browser = await browserPromise!;
      const page = await browser.newPage();
      await page.setViewport({ width: 8000, height: 8000, deviceScaleFactor: 1 });

      const tempDir = mkdtempSync(join(tmpdir(), "pams-bpmn-svg-"));
      const htmlPath = join(tempDir, "export.html");
      writeFileSync(htmlPath, buildExportHtml(), "utf8");
      await page.goto(pathToFileURL(htmlPath).href, {
        waitUntil: "networkidle0",
      });

      return page;
    })();
  }

  return exportPagePromise;
};

/** BPMN XML을 SVG 문자열로 변환한다 */
export const exportBpmnXmlToSvg = async (bpmnXml: string): Promise<string> => {
  const page = await getExportPage();
  const svg = await page.evaluate(async (xml) => {
    const exporter = (
      window as Window & {
        exportBpmnSvg?: (value: string) => Promise<string>;
      }
    ).exportBpmnSvg;

    if (!exporter) {
      throw new Error("BPMN SVG exporter is not ready");
    }

    return exporter(xml);
  }, bpmnXml);

  if (!svg?.trim()) {
    throw new Error("SVG export returned empty content");
  }

  return svg;
};

/** Puppeteer 리소스를 정리한다 */
export const closeBpmnSvgExporter = async (): Promise<void> => {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
  }
  browserPromise = null;
  exportPagePromise = null;
};
