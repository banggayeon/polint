import { FileText, Home, Settings, FileCheck, Play, Search, ChevronRight } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentStep: number;
  onStepClick: (step: number) => void;
}

const menuItems = [
  { icon: Home, label: '대시보드', href: '#' },
  { icon: FileText, label: '정책', href: '#' },
  { icon: FileCheck, label: '룰셋', href: '#' },
  { icon: Play, label: '테스트', href: '#' },
  { icon: FileCheck, label: '문서검사', href: '#' },
  { icon: FileText, label: '실행기록', href: '#' },
  { icon: FileText, label: '감사로그', href: '#' },
  { icon: Settings, label: '설정', href: '#' },
];

export function Layout({ children, currentStep, onStepClick }: LayoutProps) {
  return (
    <div className="flex h-screen bg-slate-50" style={{ width: '1440px', height: '900px', margin: '0 auto' }}>
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-xl font-semibold text-slate-900">Polint</h1>
          <p className="text-xs text-slate-500 mt-1">Policy DevOps Platform</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item, index) => (
            <button
              key={index}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors text-sm"
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-teal-900">데모 모드</span>
            </div>
            <p className="text-xs text-teal-700">전체 워크플로우 체험 중</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="font-medium text-slate-900">Enterprise Workspace</span>
              <ChevronRight className="w-4 h-4" />
              <span>데모 프로젝트</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="검색..."
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent w-64"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium">
              <Play className="w-4 h-4" />
              Run
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
