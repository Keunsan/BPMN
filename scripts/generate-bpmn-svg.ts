/**
 * svg_content가 비어 있는 BPMN 모델에 대해 SVG 미리보기를 일괄 생성한다
 */
import { config as loadEnv } from "dotenv";

import { closePool, query } from "../lib/db/pool";

import {
  closeBpmnSvgExporter,
  exportBpmnXmlToSvg,
} from "./lib/bpmn-svg-export";

loadEnv({ path: ".env.local" });

type BpmnRow = {
  model_id: number;
  model_name: string;
  bpmn_xml: string | null;
  svg_content: string | null;
};

const main = async (): Promise<void> => {
  const models = await query<BpmnRow>(
    `SELECT model_id, model_name, bpmn_xml, svg_content
     FROM bpmn_model
     WHERE bpmn_xml IS NOT NULL
       AND (svg_content IS NULL OR LTRIM(RTRIM(svg_content)) = '')
     ORDER BY model_id`,
  );

  if (models.length === 0) {
    console.log("SVG 생성 대상 BPMN 모델이 없습니다.");
    return;
  }

  console.log(`SVG 생성 대상: ${models.length}건`);

  let success = 0;
  let failed = 0;

  for (const model of models) {
    const xml = model.bpmn_xml?.trim();
    if (!xml) {
      console.log(`SKIP [${model.model_id}] ${model.model_name} — XML 없음`);
      failed += 1;
      continue;
    }

    try {
      const svg = await exportBpmnXmlToSvg(xml);
      await query(
        `UPDATE bpmn_model
         SET svg_content = @svgContent, updated_at = GETDATE()
         WHERE model_id = @modelId`,
        { modelId: model.model_id, svgContent: svg },
      );
      success += 1;
      console.log(`OK   [${model.model_id}] ${model.model_name}`);
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`FAIL [${model.model_id}] ${model.model_name} — ${message}`);
    }
  }

  console.log(`\n완료 — 성공 ${success}건, 실패 ${failed}건`);
};

main()
  .catch((err) => {
    console.error("\nSVG 일괄 생성 실패:", err.message ?? err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeBpmnSvgExporter();
    await closePool();
  });
