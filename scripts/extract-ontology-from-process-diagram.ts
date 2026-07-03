/**
 * 프로세스 체계도 엑셀 → 온톨로지 기초 데이터(용어집·정의·의미관계) 추출
 * 원본 보존, 신규 시트 4개를 _ontology.xlsx 로 저장
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";

const INPUT_PATH = join(
  process.cwd(),
  "docs",
  "프로세스체계도_쿼츠사업부_통합_260607.xlsx",
);
const OUTPUT_PATH = join(
  process.cwd(),
  "docs",
  "프로세스체계도_쿼츠사업부_통합_260607_ontology.xlsx",
);

const PROC_SHEET = "프로세스 체계도";
const TERM_SHEET = "용어, 개념";
const PROC_HEADER_ROW = 4;

type ProcessRow = {
  id: string;
  l1: string;
  l2: string;
  l3: string;
  l4: string;
  level: number;
  name: string;
  definition: string | null;
  inputInfo: string | null;
  outputInfo: string | null;
  predecessor: string | null;
  docScreenDb: string | null;
  variant: string | null;
  performer: string | null;
  timespan: string | null;
  frequency: string | null;
  system: string | null;
  menu: string | null;
  relatedTable: string | null;
  innovation: string | null;
  phenomenon: string | null;
  cause: string | null;
  bizScenario1: string | null;
  bizScenario2: string | null;
  bizScenario3: string | null;
};

type OfficialTerm = {
  prefLabel: string;
  domainModule: string;
  definition: string;
};

type GlossaryEntry = {
  termId: string;
  prefLabel: string;
  altLabels: string;
  definition: string;
  sourceType: "공식" | "L4명" | "IO산출물" | "시스템";
  sourceRef: string;
  domainModule: string;
  relatedProcessIds: string;
  status: "confirmed" | "candidate";
};

type DefinitionRow = {
  processId: string;
  level: number;
  l1: string;
  l2: string;
  l3: string;
  l4: string;
  name: string;
  definition: string;
  inputSummary: string;
  outputSummary: string;
  performer: string;
  frequency: string;
  system: string;
  menu: string;
  innovation: string;
  phenomenon: string;
  cause: string;
  bizScenario1: string;
  bizScenario2: string;
  bizScenario3: string;
};

type RelationRow = {
  relationId: string;
  subjectId: string;
  subjectName: string;
  predicate: string;
  objectId: string;
  objectName: string;
  objectType: string;
  condition: string;
  confidence: "high" | "medium" | "low";
  note: string;
};

type AuditRow = {
  category: string;
  metric: string;
  value: string;
  detail: string;
};

const toText = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).replace(/\r\n/g, "\n").trim();
  return text.length > 0 ? text : null;
};

const cell = (row: unknown[], index: number): string | null =>
  toText(row[index]);

const parseSeqParts = (seq: string): number[] =>
  seq
    .trim()
    .split(".")
    .map((part) => Number.parseInt(part, 10));

const compareSeq = (left: string, right: string): number => {
  const a = parseSeqParts(left);
  const b = parseSeqParts(right);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
};

const idSegmentCount = (id: string): number =>
  id.split(".").filter((p) => p.trim().length > 0).length;

const parentId = (id: string): string | null => {
  const parts = id.split(".").filter((p) => p.trim().length > 0);
  if (parts.length <= 1) {
    return null;
  }
  return parts.slice(0, -1).join(".");
};

const l3Id = (id: string): string => {
  const parts = id.split(".").filter((p) => p.trim().length > 0);
  return parts.slice(0, 3).join(".");
};

const normalizeLabel = (text: string): string =>
  text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[()[\]{}]/g, "");

const slugify = (text: string): string => {
  const base = text
    .toLowerCase()
    .replace(/[^\w가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base.length > 0 ? base : "term";
};

const emptyToStr = (value: string | null | undefined): string => value ?? "";

const tokenizeIo = (text: string | null): string[] => {
  if (!text) {
    return [];
  }
  return text
    .split(/[,，、\n;/]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1 && part.length < 80);
};

/** 프로세스 체계도 시트 파싱 */
const parseProcessSheet = (workbook: XLSX.WorkBook): ProcessRow[] => {
  const sheet = workbook.Sheets[PROC_SHEET];
  if (!sheet) {
    throw new Error(`시트를 찾을 수 없습니다: ${PROC_SHEET}`);
  }

  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  });

  const rows: ProcessRow[] = [];
  for (let i = PROC_HEADER_ROW + 1; i < raw.length; i++) {
    const row = raw[i];
    if (!Array.isArray(row)) {
      continue;
    }
    const id = cell(row, 0);
    if (!id) {
      continue;
    }

    const segments = idSegmentCount(id);
    const l4 = emptyToStr(cell(row, 4));
    const l3Name = emptyToStr(cell(row, 3));
    const levelFromCol = Number.parseInt(String(row[5] ?? ""), 10);
    const level =
      Number.isFinite(levelFromCol) && levelFromCol > 0
        ? levelFromCol
        : segments;

    const name =
      level >= 4 || segments >= 4
        ? l4
        : l3Name || l4 || emptyToStr(cell(row, 6));

    rows.push({
      id,
      l1: emptyToStr(cell(row, 1)),
      l2: emptyToStr(cell(row, 2)),
      l3: l3Name,
      l4,
      level,
      name,
      definition: cell(row, 6),
      inputInfo: cell(row, 7),
      outputInfo: cell(row, 9),
      predecessor: cell(row, 8),
      docScreenDb: cell(row, 10),
      variant: cell(row, 11),
      performer: cell(row, 12),
      timespan: cell(row, 13),
      frequency: cell(row, 14),
      system: cell(row, 15),
      menu: cell(row, 16),
      relatedTable: cell(row, 17),
      innovation: cell(row, 18),
      phenomenon: cell(row, 19),
      cause: cell(row, 20),
      bizScenario1: cell(row, 21),
      bizScenario2: cell(row, 22),
      bizScenario3: cell(row, 23),
    });
  }

  return rows.sort((a, b) => compareSeq(a.id, b.id));
};

/** 용어, 개념 시트 파싱 */
const parseOfficialTerms = (workbook: XLSX.WorkBook): OfficialTerm[] => {
  const sheet = workbook.Sheets[TERM_SHEET];
  if (!sheet) {
    return [];
  }

  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  });

  const terms: OfficialTerm[] = [];
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];
    if (!Array.isArray(row)) {
      continue;
    }
    const prefLabel = cell(row, 0);
    if (!prefLabel) {
      continue;
    }
    terms.push({
      prefLabel,
      domainModule: emptyToStr(cell(row, 1)),
      definition: emptyToStr(cell(row, 2)),
    });
  }
  return terms;
};

/** Summary 시트 L3 목록 */
const parseSummaryL3 = (workbook: XLSX.WorkBook): string[] => {
  const sheet = workbook.Sheets.Summary;
  if (!sheet) {
    return [];
  }

  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  });

  const result: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!Array.isArray(row)) {
      continue;
    }
    const seq = cell(row, 0);
    const l1 = cell(row, 1);
    const l2 = cell(row, 2);
    const l3 = cell(row, 3);
    if (!seq || !l1 || !l2 || !l3) {
      continue;
    }
    if (!/^\d+\.\d+\.\d+$/.test(seq)) {
      continue;
    }
    result.push(`${seq}|${l1}>${l2}>${l3}`);
  }
  return result;
};

/** Sheet1 수행주체 목록 */
const parsePerformers = (workbook: XLSX.WorkBook): Set<string> => {
  const sheet = workbook.Sheets.Sheet1;
  const performers = new Set<string>();
  if (!sheet) {
    return performers;
  }

  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  });
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];
    if (!Array.isArray(row)) {
      continue;
    }
    const name = cell(row, 0);
    if (name) {
      performers.add(name);
    }
  }
  return performers;
};

/** 추출_정의 시트 생성 */
const buildDefinitions = (processRows: ProcessRow[]): DefinitionRow[] =>
  processRows.map((row) => ({
    processId: row.id,
    level: row.level >= 4 || idSegmentCount(row.id) >= 4 ? 4 : 3,
    l1: row.l1,
    l2: row.l2,
    l3: row.l3,
    l4: row.l4,
    name: row.name,
    definition: emptyToStr(row.definition),
    inputSummary: emptyToStr(row.inputInfo),
    outputSummary: emptyToStr(row.outputInfo),
    performer: emptyToStr(row.performer),
    frequency: emptyToStr(row.frequency),
    system: emptyToStr(row.system),
    menu: emptyToStr(row.menu),
    innovation: emptyToStr(row.innovation),
    phenomenon: emptyToStr(row.phenomenon),
    cause: emptyToStr(row.cause),
    bizScenario1: emptyToStr(row.bizScenario1),
    bizScenario2: emptyToStr(row.bizScenario2),
    bizScenario3: emptyToStr(row.bizScenario3),
  }));

/** 추출_용어집 시트 생성 */
const buildGlossary = (
  processRows: ProcessRow[],
  officialTerms: OfficialTerm[],
): GlossaryEntry[] => {
  const byNorm = new Map<string, GlossaryEntry>();
  const usedIds = new Set<string>();

  const ensureUniqueId = (base: string): string => {
    let id = base;
    let n = 2;
    while (usedIds.has(id)) {
      id = `${base}-${n}`;
      n += 1;
    }
    usedIds.add(id);
    return id;
  };

  const upsert = (entry: Omit<GlossaryEntry, "termId"> & { termId?: string }) => {
    const norm = normalizeLabel(entry.prefLabel);
    const existing = byNorm.get(norm);
    if (existing) {
      const altSet = new Set(
        `${existing.altLabels},${entry.altLabels}`
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
      existing.altLabels = [...altSet].join(", ");
      const ids = new Set(
        `${existing.relatedProcessIds},${entry.relatedProcessIds}`
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
      existing.relatedProcessIds = [...ids].join(", ");
      if (!existing.definition && entry.definition) {
        existing.definition = entry.definition;
      }
      if (existing.status === "candidate" && entry.status === "confirmed") {
        existing.status = "confirmed";
      }
      return;
    }

    const termId = ensureUniqueId(entry.termId ?? slugify(entry.prefLabel));
    byNorm.set(norm, {
      termId,
      prefLabel: entry.prefLabel,
      altLabels: entry.altLabels,
      definition: entry.definition,
      sourceType: entry.sourceType,
      sourceRef: entry.sourceRef,
      domainModule: entry.domainModule,
      relatedProcessIds: entry.relatedProcessIds,
      status: entry.status,
    });
  };

  for (const term of officialTerms) {
    upsert({
      prefLabel: term.prefLabel,
      altLabels: "",
      definition: term.definition,
      sourceType: "공식",
      sourceRef: `${TERM_SHEET}`,
      domainModule: term.domainModule,
      relatedProcessIds: "",
      status: "confirmed",
    });
  }

  const l4Rows = processRows.filter(
    (r) => r.level >= 4 || idSegmentCount(r.id) >= 4,
  );

  for (const row of l4Rows) {
    if (!row.l4) {
      continue;
    }
    const matchedOfficial = officialTerms.find(
      (t) =>
        normalizeLabel(t.prefLabel) === normalizeLabel(row.l4) ||
        row.l4.includes(t.prefLabel) ||
        t.prefLabel.includes(row.l4),
    );
    if (matchedOfficial) {
      upsert({
        prefLabel: matchedOfficial.prefLabel,
        altLabels: row.l4 !== matchedOfficial.prefLabel ? row.l4 : "",
        definition: matchedOfficial.definition,
        sourceType: "공식",
        sourceRef: `${PROC_SHEET}!${row.id}/L4`,
        domainModule: row.l1,
        relatedProcessIds: row.id,
        status: "confirmed",
      });
    } else {
      upsert({
        prefLabel: row.l4,
        altLabels: "",
        definition: emptyToStr(row.definition),
        sourceType: "L4명",
        sourceRef: `${PROC_SHEET}!${row.id}/L4`,
        domainModule: row.l1,
        relatedProcessIds: row.id,
        status: "candidate",
      });
    }
  }

  const systems = new Set<string>();
  for (const row of processRows) {
    if (row.system) {
      for (const part of row.system.split(/\r?\n/)) {
        const s = part.trim();
        if (s) {
          systems.add(s);
        }
      }
    }
  }
  for (const system of systems) {
    upsert({
      prefLabel: system,
      altLabels: "",
      definition: "",
      sourceType: "시스템",
      sourceRef: `${PROC_SHEET}/시스템`,
      domainModule: "",
      relatedProcessIds: processRows
        .filter((r) => r.system?.includes(system))
        .map((r) => r.id)
        .join(", "),
      status: "candidate",
    });
  }

  for (const row of l4Rows) {
    const tokens = [
      ...tokenizeIo(row.inputInfo),
      ...tokenizeIo(row.outputInfo),
      ...tokenizeIo(row.docScreenDb),
    ];
    for (const token of tokens) {
      const norm = normalizeLabel(token);
      if (byNorm.has(norm)) {
        const existing = byNorm.get(norm)!;
        const ids = new Set(
          `${existing.relatedProcessIds},${row.id}`
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        );
        existing.relatedProcessIds = [...ids].join(", ");
        continue;
      }
      upsert({
        prefLabel: token,
        altLabels: "",
        definition: "",
        sourceType: "IO산출물",
        sourceRef: `${PROC_SHEET}!${row.id}/IO`,
        domainModule: row.l1,
        relatedProcessIds: row.id,
        status: "candidate",
      });
    }
  }

  return [...byNorm.values()].sort((a, b) =>
    a.prefLabel.localeCompare(b.prefLabel, "ko"),
  );
};

/** L4 이름으로 동일 L3 내 Task 매칭 */
const matchL4ByName = (
  name: string,
  l3Tasks: ProcessRow[],
): { match: ProcessRow | null; candidates: ProcessRow[]; confidence: "high" | "medium" | "low" } => {
  const normalized = normalizeLabel(name);
  const exact = l3Tasks.filter((t) => normalizeLabel(t.l4) === normalized);
  if (exact.length === 1) {
    return { match: exact[0]!, candidates: exact, confidence: "high" };
  }
  if (exact.length > 1) {
    return { match: null, candidates: exact, confidence: "low" };
  }

  const partial = l3Tasks.filter(
    (t) =>
      normalizeLabel(t.l4).includes(normalized) ||
      normalized.includes(normalizeLabel(t.l4)),
  );
  if (partial.length === 1) {
    return { match: partial[0]!, candidates: partial, confidence: "medium" };
  }
  return { match: null, candidates: partial, confidence: "low" };
};

/** 추출_의미관계 시트 생성 */
const buildRelations = (
  processRows: ProcessRow[],
  glossary: GlossaryEntry[],
  knownPerformers: Set<string>,
): RelationRow[] => {
  const relations: RelationRow[] = [];
  let seq = 1;

  const add = (
    input: Omit<RelationRow, "relationId">,
  ): void => {
    relations.push({
      relationId: `REL-${String(seq).padStart(5, "0")}`,
      ...input,
    });
    seq += 1;
  };

  const byId = new Map(processRows.map((r) => [r.id, r]));
  const l4Rows = processRows.filter(
    (r) => r.level >= 4 || idSegmentCount(r.id) >= 4,
  );
  const l3Rows = processRows.filter(
    (r) => idSegmentCount(r.id) === 3 && r.level < 4,
  );

  const glossaryByNorm = new Map(
    glossary.map((g) => [normalizeLabel(g.prefLabel), g]),
  );

  for (const row of processRows) {
    const parent = parentId(row.id);
    if (parent && byId.has(parent)) {
      const parentRow = byId.get(parent)!;
      add({
        subjectId: parent,
        subjectName: parentRow.name || parentRow.l3 || parentRow.l4,
        predicate: "contains",
        objectId: row.id,
        objectName: row.name,
        objectType: row.level >= 4 || idSegmentCount(row.id) >= 4 ? "Task" : "Process",
        condition: "",
        confidence: "high",
        note: "",
      });
    }
  }

  const l4ByL3 = new Map<string, ProcessRow[]>();
  for (const row of l4Rows) {
    const key = l3Id(row.id);
    const list = l4ByL3.get(key) ?? [];
    list.push(row);
    l4ByL3.set(key, list);
  }

  for (const row of l4Rows) {
    if (!row.predecessor) {
      continue;
    }
    const tasks = l4ByL3.get(l3Id(row.id)) ?? [];
    const { match, candidates, confidence } = matchL4ByName(
      row.predecessor,
      tasks,
    );
    add({
      subjectId: row.id,
      subjectName: row.l4 || row.name,
      predicate: "precedes",
      objectId: match?.id ?? "",
      objectName: row.predecessor,
      objectType: "Task",
      condition: "",
      confidence,
      note:
        match === null
          ? candidates.length > 0
            ? `후보: ${candidates.map((c) => c.l4).join(" | ")}`
            : "동일 L3 내 매칭 실패"
          : "",
    });
  }

  for (const row of l4Rows) {
    if (!row.system && !row.menu) {
      continue;
    }
    const screenName =
      row.system && row.menu
        ? `${row.system} / ${row.menu}`
        : row.menu || row.system || "";
    add({
      subjectId: row.id,
      subjectName: row.l4 || row.name,
      predicate: "usesScreen",
      objectId: "",
      objectName: screenName,
      objectType: "Screen",
      condition: "",
      confidence: row.system && row.menu ? "high" : "medium",
      note: "",
    });
  }

  for (const row of l4Rows) {
    if (!row.performer || row.performer === "-") {
      continue;
    }
    const parts = row.performer.split(/\r?\n/).map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      const inSheet = knownPerformers.has(part);
      add({
        subjectId: row.id,
        subjectName: row.l4 || row.name,
        predicate: "performedBy",
        objectId: "",
        objectName: part,
        objectType: "Role",
        condition: "",
        confidence: inSheet ? "high" : "medium",
        note: inSheet ? "Sheet1 수행주체 목록 일치" : "",
      });
    }
  }

  for (const row of l4Rows) {
    const tokens = [
      ...tokenizeIo(row.inputInfo).map((t) => ({ token: t, kind: "INPUT" })),
      ...tokenizeIo(row.outputInfo).map((t) => ({ token: t, kind: "OUTPUT" })),
    ];
    for (const { token, kind } of tokens) {
      const term = glossaryByNorm.get(normalizeLabel(token));
      add({
        subjectId: row.id,
        subjectName: row.l4 || row.name,
        predicate: "references",
        objectId: term?.termId ?? "",
        objectName: token,
        objectType: "GlossaryTerm",
        condition: kind,
        confidence: term ? "high" : "low",
        note: term ? "" : "용어집 미등록 후보",
      });
    }
  }

  return relations;
};

/** 추출_품질리포트 시트 생성 */
const buildAudit = (
  processRows: ProcessRow[],
  definitions: DefinitionRow[],
  glossary: GlossaryEntry[],
  relations: RelationRow[],
  summaryL3: string[],
  officialTerms: OfficialTerm[],
): AuditRow[] => {
  const audit: AuditRow[] = [];

  const l4Rows = processRows.filter(
    (r) => r.level >= 4 || idSegmentCount(r.id) >= 4,
  );
  const l3FromProc = new Set(
    processRows
      .filter((r) => idSegmentCount(r.id) === 3)
      .map((r) => `${r.id}|${r.l1}>${r.l2}>${r.l3}`),
  );
  const l3FromL4 = new Set(l4Rows.map((r) => l3Id(r.id)));
  for (const l3 of l3FromL4) {
    if (!processRows.some((r) => r.id === l3)) {
      l3FromProc.add(`${l3}|(L4에서 유도)`);
    }
  }

  const summarySet = new Set(summaryL3);
  const procL3Keys = [...l3FromProc].map((s) => s.split("|")[0]!);
  const summaryOnly = summaryL3.filter((s) => !procL3Keys.includes(s.split("|")[0]!));
  const procOnly = procL3Keys.filter(
    (id) => !summaryL3.some((s) => s.startsWith(`${id}|`)),
  );

  const precedes = relations.filter((r) => r.predicate === "precedes");
  const precedesOk = precedes.filter((r) => r.objectId).length;

  const dupIds = new Map<string, number>();
  for (const row of processRows) {
    dupIds.set(row.id, (dupIds.get(row.id) ?? 0) + 1);
  }
  const duplicates = [...dupIds.entries()].filter(([, c]) => c > 1);

  const emptyDefL4 = l4Rows.filter((r) => !r.definition);
  const orphanL4 = l4Rows.filter(
    (r) => !processRows.some((p) => p.id === l3Id(r.id) && idSegmentCount(p.id) === 3),
  );

  const push = (category: string, metric: string, value: string, detail = "") => {
    audit.push({ category, metric, value, detail });
  };

  push("요약", "프로세스 체계도 전체 행", String(processRows.length));
  push("요약", "L3 프로세스 행", String(processRows.filter((r) => idSegmentCount(r.id) === 3).length));
  push("요약", "L4 Task 행", String(l4Rows.length));
  push("요약", "추출_정의 행", String(definitions.length));
  push("요약", "추출_용어집 행", String(glossary.length));
  push("요약", "추출_의미관계 행", String(relations.length));
  push("요약", "공식 용어", String(officialTerms.length));
  push(
    "요약",
    "용어 confirmed/candidate",
    `${glossary.filter((g) => g.status === "confirmed").length} / ${glossary.filter((g) => g.status === "candidate").length}`,
  );

  push(
    "채움률",
    "정의 컬럼",
    `${processRows.filter((r) => r.definition).length}/${processRows.length}`,
    `${Math.round((processRows.filter((r) => r.definition).length / processRows.length) * 100)}%`,
  );
  push(
    "채움률",
    "선행 프로세스",
    `${l4Rows.filter((r) => r.predecessor).length}/${l4Rows.length}`,
  );
  push(
    "채움률",
    "시스템+메뉴",
    `${l4Rows.filter((r) => r.system || r.menu).length}/${l4Rows.length}`,
  );
  push("채움률", "관련 TABLE", `${processRows.filter((r) => r.relatedTable).length}/${processRows.length}`);

  push(
    "매칭",
    "precedes 성공률",
    `${precedesOk}/${precedes.length}`,
    precedes.length > 0
      ? `${Math.round((precedesOk / precedes.length) * 100)}%`
      : "N/A",
  );
  push(
    "매칭",
    "precedes high confidence",
    String(precedes.filter((r) => r.confidence === "high").length),
  );
  push(
    "매칭",
    "precedes low confidence",
    String(precedes.filter((r) => r.confidence === "low").length),
  );

  push("Summary 대조", "Summary L3 건수", String(summaryL3.length));
  push("Summary 대조", "체계도 L3 건수", String(procL3Keys.length));
  push("Summary 대조", "Summary에만 존재", String(summaryOnly.length));
  for (const item of summaryOnly) {
    push("Summary에만 존재", item.split("|")[0]!, item.split("|")[1] ?? "", item);
  }
  push("Summary 대조", "체계도에만 존재", String(procOnly.length));
  for (const id of procOnly) {
    const row = processRows.find((r) => r.id === id);
    push(
      "체계도에만 존재",
      id,
      row ? `${row.l1}>${row.l2}>${row.l3}` : "",
    );
  }

  push("이슈", "중복 ID", String(duplicates.length));
  for (const [id, count] of duplicates) {
    push("중복 ID", id, String(count));
  }

  push("이슈", "빈 정의 L4", String(emptyDefL4.length));
  for (const row of emptyDefL4.slice(0, 20)) {
    push("빈 정의 L4", row.id, row.l4);
  }
  if (emptyDefL4.length > 20) {
    push("빈 정의 L4", "...", `외 ${emptyDefL4.length - 20}건`);
  }

  push("이슈", "고아 L4 (L3 헤더 없음)", String(orphanL4.length));
  for (const row of orphanL4.slice(0, 20)) {
    push("고아 L4", row.id, row.l4, `부모 L3: ${l3Id(row.id)}`);
  }

  return audit;
};

const sheetFromRows = <T extends Record<string, string | number>>(
  rows: T[],
): XLSX.WorkSheet => XLSX.utils.json_to_sheet(rows);

const main = (): void => {
  const buffer = readFileSync(INPUT_PATH);
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const processRows = parseProcessSheet(workbook);
  const officialTerms = parseOfficialTerms(workbook);
  const summaryL3 = parseSummaryL3(workbook);
  const knownPerformers = parsePerformers(workbook);

  const definitions = buildDefinitions(processRows);
  const glossary = buildGlossary(processRows, officialTerms);
  const relations = buildRelations(processRows, glossary, knownPerformers);
  const audit = buildAudit(
    processRows,
    definitions,
    glossary,
    relations,
    summaryL3,
    officialTerms,
  );

  const outWb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    outWb,
    sheetFromRows(
      glossary.map((g) => ({
        term_id: g.termId,
        pref_label: g.prefLabel,
        alt_labels: g.altLabels,
        definition: g.definition,
        source_type: g.sourceType,
        source_ref: g.sourceRef,
        domain_module: g.domainModule,
        related_process_ids: g.relatedProcessIds,
        status: g.status,
      })),
    ),
    "추출_용어집",
  );

  XLSX.utils.book_append_sheet(
    outWb,
    sheetFromRows(
      definitions.map((d) => ({
        process_id: d.processId,
        level: d.level,
        l1: d.l1,
        l2: d.l2,
        l3: d.l3,
        l4: d.l4,
        name: d.name,
        definition: d.definition,
        input_summary: d.inputSummary,
        output_summary: d.outputSummary,
        performer: d.performer,
        frequency: d.frequency,
        system: d.system,
        menu: d.menu,
        innovation: d.innovation,
        phenomenon: d.phenomenon,
        cause: d.cause,
        biz_scenario_1: d.bizScenario1,
        biz_scenario_2: d.bizScenario2,
        biz_scenario_3: d.bizScenario3,
      })),
    ),
    "추출_정의",
  );

  XLSX.utils.book_append_sheet(
    outWb,
    sheetFromRows(
      relations.map((r) => ({
        relation_id: r.relationId,
        subject_id: r.subjectId,
        subject_name: r.subjectName,
        predicate: r.predicate,
        object_id: r.objectId,
        object_name: r.objectName,
        object_type: r.objectType,
        condition: r.condition,
        confidence: r.confidence,
        note: r.note,
      })),
    ),
    "추출_의미관계",
  );

  XLSX.utils.book_append_sheet(
    outWb,
    sheetFromRows(
      audit.map((a) => ({
        category: a.category,
        metric: a.metric,
        value: a.value,
        detail: a.detail,
      })),
    ),
    "추출_품질리포트",
  );

  const outBuffer = XLSX.write(outWb, { type: "buffer", bookType: "xlsx" });
  writeFileSync(OUTPUT_PATH, outBuffer);

  const precedes = relations.filter((r) => r.predicate === "precedes");
  const precedesOk = precedes.filter((r) => r.objectId).length;

  console.log("=== 온톨로지 추출 완료 ===");
  console.log(`입력: ${INPUT_PATH}`);
  console.log(`출력: ${OUTPUT_PATH}`);
  console.log(`프로세스 행: ${processRows.length}`);
  console.log(`추출_정의: ${definitions.length}`);
  console.log(`추출_용어집: ${glossary.length} (confirmed ${glossary.filter((g) => g.status === "confirmed").length})`);
  console.log(`추출_의미관계: ${relations.length}`);
  console.log(`  contains: ${relations.filter((r) => r.predicate === "contains").length}`);
  console.log(`  precedes: ${precedes.length} (매칭 ${precedesOk}, ${precedes.length > 0 ? Math.round((precedesOk / precedes.length) * 100) : 0}%)`);
  console.log(`  usesScreen: ${relations.filter((r) => r.predicate === "usesScreen").length}`);
  console.log(`  performedBy: ${relations.filter((r) => r.predicate === "performedBy").length}`);
  console.log(`  references: ${relations.filter((r) => r.predicate === "references").length}`);
  console.log(`추출_품질리포트: ${audit.length} 행`);
};

main();
