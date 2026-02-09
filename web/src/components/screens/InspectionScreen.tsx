import {
  ChevronLeft,
  ChevronRight,
  Upload,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Link as LinkIcon,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { extractTextFromFile, extractTextFromUrl, getRun, lint, type DocDto } from "../../lib/polintApi";
import { usePolint, type InspectionDoc } from "../../lib/polintStore";

interface InspectionScreenProps {
  onNext: () => void;
  onBack: () => void;
}

type UiDoc = InspectionDoc & {
  status: "ready" | "processing" | "error";
  sizeLabel?: string;
  errorMessage?: string;
  source?: "file" | "url";
};

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function toLineView(text: string) {
  const lines = text.split("\n");
  return lines.map((line, idx) => (
    <div key={idx} className="px-4 py-1">
      <span className="text-slate-400 text-xs mr-4 select-none">{idx + 1}</span>
      <span className="text-sm text-slate-100">{line}</span>
    </div>
  ));
}

export function InspectionScreen({ onNext, onBack }: InspectionScreenProps) {
  const { state, setState } = usePolint();

  const [uiDocs, setUiDocs] = useState<UiDoc[]>(() =>
    (state.inspectionDocs ?? []).map((d) => ({
      ...d,
      status: "ready",
      sizeLabel: "-",
    }))
  );

  const [selectedId, setSelectedId] = useState<string | null>(() => uiDocs[0]?.id ?? null);
  const selectedDoc = useMemo(() => uiDocs.find((d) => d.id === selectedId) ?? null, [uiDocs, selectedId]);

  const fileRef = useRef<HTMLInputElement | null>(null);

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false); // lint 실행
  const [extracting, setExtracting] = useState(false); // 업로드/추출 중
  const [error, setError] = useState<string | null>(null);

  const syncStoreUpsert = (doc: InspectionDoc) => {
    setState((s) => ({
      ...s,
      inspectionDocs: [...(s.inspectionDocs ?? []).filter((x) => x.id !== doc.id), doc],
    }));
  };

  const syncStoreRemove = (id: string) => {
    setState((s) => ({
      ...s,
      inspectionDocs: (s.inspectionDocs ?? []).filter((x) => x.id !== id),
    }));
  };

  const handlePickFile = () => fileRef.current?.click();

  const addPlaceholder = (p: UiDoc) => {
    setUiDocs((prev) => {
      const next = [p, ...prev];
      if (!selectedId) setSelectedId(p.id);
      return next;
    });
  };

  const patchUiDoc = (id: string, patch: Partial<UiDoc>) => {
    setUiDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    setError(null);
    setExtracting(true);

    for (const f of list) {
      const id = `DOC-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      addPlaceholder({
        id,
        title: f.name,
        content: "",
        status: "processing",
        sizeLabel: formatBytes(f.size),
        source: "file",
      });

      try {
        const resp = await extractTextFromFile(f);
        const title = resp.title || f.name;
        const content = resp.text;

        patchUiDoc(id, { title, content, status: "ready", errorMessage: undefined });
        syncStoreUpsert({ id, title, content });
      } catch (e) {
        patchUiDoc(id, { status: "error", errorMessage: e instanceof Error ? e.message : String(e) });
      }
    }

    setExtracting(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (extracting) return;
    await handleFiles(e.dataTransfer.files);
  };

  const handleUrlAdd = async () => {
    const u = url.trim();
    if (!u) return;

    setError(null);
    setExtracting(true);

    const id = `URL-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    addPlaceholder({
      id,
      title: u,
      content: "",
      status: "processing",
      sizeLabel: "-",
      source: "url",
    });

    try {
      const resp = await extractTextFromUrl(u);
      const title = resp.title || u;
      const content = resp.text;

      patchUiDoc(id, { title, content, status: "ready", errorMessage: undefined });
      syncStoreUpsert({ id, title, content });
      setUrl("");
    } catch (e) {
      patchUiDoc(id, { status: "error", errorMessage: e instanceof Error ? e.message : String(e) });
    } finally {
      setExtracting(false);
    }
  };

  const removeDoc = (id: string) => {
    setUiDocs((prev) => prev.filter((d) => d.id !== id));
    syncStoreRemove(id);

    if (selectedId === id) {
      const next = uiDocs.find((d) => d.id !== id);
      setSelectedId(next?.id ?? null);
    }
  };

  const hasProcessing = uiDocs.some((d) => d.status === "processing");
  const readyCount = uiDocs.filter((d) => d.status === "ready").length;
  const errorCount = uiDocs.filter((d) => d.status === "error").length;

  const handleRun = async () => {
    if (!state.rulesetId) {
      setError("Ruleset ID가 없습니다. 먼저 3단계에서 룰 컴파일(테스트 생성)을 진행하세요.");
      return;
    }
    if (hasProcessing) {
      setError("아직 텍스트 추출 중인 문서가 있습니다. 완료 후 실행하세요.");
      return;
    }

    const docsForLint: DocDto[] = (state.inspectionDocs ?? []).map((d) => ({
      title: d.title,
      content: d.content,
    }));

    if (docsForLint.length === 0) {
      setError("검사할 문서가 없습니다. PDF/DOCX/TXT 파일 또는 URL을 추가하세요.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const lintResp = await lint(state.rulesetId, docsForLint);
      const run = await getRun(lintResp.runId);
      setState((s) => ({ ...s, lastRun: run }));
      onNext();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full bg-slate-50 flex">
      {/* Main Content */}
      <div className="flex-1 p-8 overflow-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-900">문서 검사</h2>
          <p className="text-slate-600 mt-1">업로드한 문서에 룰셋을 적용하여 위반사항을 검출합니다</p>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div
            onClick={handlePickFile}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-teal-400 hover:bg-teal-50/50 transition-all cursor-pointer"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-slate-400" />
              </div>
              <div>
                <p className="text-slate-900 font-medium">{extracting ? "추출 중..." : "문서 업로드"}</p>
                <p className="text-sm text-slate-500">PDF, DOCX, TXT, Markdown 지원 (드래그/클릭)</p>
              </div>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.docx,.txt,.md"
            onChange={(e) => {
              const files = e.target.files;
              if (files) handleFiles(files);
              e.target.value = "";
            }}
          />

          {/* URL */}
          <div className="mt-4">
            <div className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              URL로 추가
            </div>
            <div className="flex gap-2">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <button
                onClick={handleUrlAdd}
                disabled={extracting || !url.trim()}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm disabled:opacity-50"
              >
                추가
              </button>
            </div>
          </div>
        </div>

        {/* Document List */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
          <div className="border-b border-slate-200 px-6 py-4 bg-slate-50 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">검사 대상 문서 ({uiDocs.length})</h3>
            <div className="text-xs text-slate-600 flex gap-2">
              <span className="px-2 py-1 bg-green-50 border border-green-200 rounded">Ready {readyCount}</span>
              <span className="px-2 py-1 bg-red-50 border border-red-200 rounded">Error {errorCount}</span>
            </div>
          </div>

          {uiDocs.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">아직 문서가 없습니다. 파일 또는 URL을 추가하세요.</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {uiDocs.map((doc) => {
                const statusIcon =
                  doc.status === "ready" ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : doc.status === "processing" ? (
                    <Clock className="w-4 h-4 text-blue-600 animate-spin" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  );

                return (
                  <div
                    key={doc.id}
                    className={`w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      selectedId === doc.id ? "bg-teal-50" : ""
                    }`}
                  >
                    <button className="flex items-center gap-4 flex-1 text-left" onClick={() => setSelectedId(doc.id)}>
                      <FileText className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="font-medium text-slate-900">{doc.title}</p>
                        <p className="text-xs text-slate-500">
                          {doc.sizeLabel ?? "-"} · {doc.source ?? "file"}
                          {doc.status === "error" && doc.errorMessage ? ` · ${doc.errorMessage}` : ""}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-3">
                      {statusIcon}
                      <button
                        onClick={() => removeDoc(doc.id)}
                        className="p-1 rounded hover:bg-slate-200 text-slate-500"
                        title="삭제"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Document Preview */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4 bg-slate-50 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">문서 미리보기</h3>
            {selectedDoc ? (
              <span className="text-xs text-slate-600">{selectedDoc.status === "ready" ? "Ready" : selectedDoc.status}</span>
            ) : null}
          </div>

          <div className="bg-slate-900 p-6 max-h-96 overflow-auto">
            <div className="font-mono text-sm leading-relaxed">
              {!selectedDoc ? (
                <div className="text-slate-300">선택된 문서가 없습니다.</div>
              ) : selectedDoc.status !== "ready" ? (
                <div className="text-slate-300">
                  {selectedDoc.status === "processing" ? "텍스트 추출 중입니다..." : `추출 실패: ${selectedDoc.errorMessage ?? "unknown error"}`}
                </div>
              ) : (
                toLineView(selectedDoc.content)
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            이전
          </button>
          <button
            onClick={handleRun}
            disabled={loading || extracting || hasProcessing}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "검사 중..." : "결과 보기"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">오류: {error}</div>
        ) : null}
      </div>

      {/* Right Panel */}
      <div className="w-96 bg-white border-l border-slate-200 p-6 overflow-auto">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-teal-600" />
            실행 요약
          </h3>
          <p className="text-sm text-slate-600 mt-1">룰셋: {state.rulesetId ? <span className="font-mono">{state.rulesetId}</span> : "없음"}</p>
        </div>

        <div className="space-y-3 text-sm text-slate-700">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="font-medium text-slate-900 mb-1">체크 포인트</div>
            <ul className="list-disc pl-5 space-y-1 text-slate-700">
              <li>문서 추가 후 텍스트 추출이 완료되어야 실행 가능합니다.</li>
              <li>“결과 보기”는 업로드된 모든 문서를 한 번에 lint 합니다.</li>
              <li>결과는 다음 화면(결과)에서 문서별 위반사항/수정 제안을 확인합니다.</li>
            </ul>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <div className="font-medium text-slate-900 mb-2">현재 문서</div>
            <div className="text-slate-600">Ready: {readyCount}</div>
            <div className="text-slate-600">Processing: {uiDocs.filter((d) => d.status === "processing").length}</div>
            <div className="text-slate-600">Error: {errorCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
