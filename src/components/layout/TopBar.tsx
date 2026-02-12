import { Search, Download, Mail, Menu } from 'lucide-react';
import { API_BASE } from '../../config/api';

interface TopBarProps {
    onMenuClick?: () => void;
}

const TopBar = ({ onMenuClick }: TopBarProps) => {
    return (
        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-4 flex-1">
                {/* Mobile Menu Button */}
                <button
                    onClick={onMenuClick}
                    className="p-2 text-slate-400 hover:text-slate-100 lg:hidden"
                >
                    <Menu className="w-6 h-6" />
                </button>

                {/* Search Bar */}
                <div className="flex items-center flex-1 max-w-md">
                    <div className="relative w-full">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <Search className="w-5 h-5 text-slate-500" />
                        </span>
                        <input
                            type="text"
                            placeholder="Search Intelligence..."
                            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md focus:ring-cyan-500 focus:border-cyan-500 block w-full pl-10 p-2 placeholder-slate-500"
                        />
                    </div>
                </div>
            </div>

            <div className="flex items-center space-x-2 lg:space-x-4">
                <button
                    onClick={() => {
                        fetch(`${API_BASE}/api/notifications/send`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: 'poornasujampathi@gmail.com' })
                        })
                            .then(res => res.json())
                            .then(data => {
                                if (data.success) alert('Report sent to poornasujampathi@gmail.com');
                                else alert('Failed: Check Setup in server/services/emailService.js');
                            })
                            .catch(() => alert('Error connecting to server'));
                    }}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 lg:px-4 rounded-lg border border-slate-700 transition-all font-medium text-xs lg:text-sm">
                    <Mail className="w-4 h-4" />
                    <span className="hidden sm:inline">Email Report</span>
                </button>
                <a href={`${API_BASE}/api/reports/daily`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 px-3 py-2 lg:px-4 rounded-lg border border-slate-700 hover:border-cyan-500/50 transition-all font-medium text-xs lg:text-sm">
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download Report</span>
                </a>
            </div>
        </header>
    );
};

export default TopBar;
