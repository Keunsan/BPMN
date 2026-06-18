/** 페이지 헤더·필터 패널 카드 */
export const pamsPanelCardClass =
  "rounded-lg border border-slate-200/85 bg-white p-2 shadow-sm dark:border-slate-600/65 dark:bg-slate-900/40";

/** DataGrid·ContentPanel 공통 콘텐츠 셸 */
export const pamsContentPanelClass =
  "relative flex min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200/85 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_1px_2px_rgba(15,23,42,0.03),0_4px_20px_-4px_rgba(15,23,42,0.07),0_12px_44px_-14px_rgba(15,23,42,0.055)] dark:border-slate-600/65 dark:bg-slate-900/40 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_2px_14px_-2px_rgba(0,0,0,0.34),0_12px_44px_-14px_rgba(0,0,0,0.48)]";

/** 패널·캔버스 공통 제목 바 셸 — h-10(40px) 고정 */
export const panelTitleBarShellClass =
  "flex h-10 shrink-0 items-center border-b border-slate-200/80 px-3 dark:border-slate-600/60";

/** DataGrid·ContentPanel 제목 바 */
export const panelTitleBarClass =
  "flex h-10 shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 px-3 dark:border-slate-600/60";

/** ListPageBody 우측 PageContent 본문 기본 클래스 */
export const listPageContentBodyClass = "flex min-h-0 flex-1 flex-col";

/** FilterPanel 필드 세로 간격 */
export const filterPanelFieldStackClass = "space-y-4";

/** FilterPanel 접힘 너비(px) — Tailwind `w-8`(2rem)과 동일 */
export const FILTER_PANEL_COLLAPSED_WIDTH_PX = 32;
