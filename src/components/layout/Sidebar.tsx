import { LayoutDashboard, ShieldAlert, Shield, BarChart3, Flame, Database, Radio } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
    onClose?: () => void;
}

const Sidebar = ({ onClose }: SidebarProps) => {
    const location = useLocation();

    const navItems = [
        { icon: LayoutDashboard, label: 'Global News', path: '/' },
        { icon: BarChart3, label: 'Severity Analysis', path: '/metrics' },
        { icon: Flame, label: 'Critical Threats', path: '/critical' },
        { icon: ShieldAlert, label: 'Threat Intel', path: '/threats' },
        { icon: Database, label: 'Data Archives', path: '/archives' },
        { icon: Radio, label: 'Intel Sources', path: '/sources' },
    ];

    return (
        <aside className="w-64 h-full bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl lg:shadow-none">
            <div className="h-16 flex items-center px-6 border-b border-slate-800 justify-between">
                <div className="flex items-center">
                    <Shield className="w-8 h-8 text-cyan-500 mr-3" />
                    <span className="text-lg font-bold tracking-wider text-slate-100">NO <span className="text-cyan-500">ENTRY</span></span>
                </div>
            </div>

            <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <Link
                        key={item.label}
                        to={item.path}
                        onClick={onClose} // Close sidebar on mobile when link clicked
                        className={`w-full flex items-center px-4 py-4 rounded-xl transition-colors group mb-2 ${location.pathname === item.path
                            ? 'bg-cyan-500/10 text-cyan-400'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                            }`}
                    >
                        <item.icon className={`w-6 h-6 mr-4 ${location.pathname === item.path ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-100'}`} />
                        <span className="font-bold text-lg">{item.label}</span>
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                        SR
                    </div>
                    <div className="ml-3">
                        <p className="text-sm font-medium text-slate-200">Sujampathi Rathnayaka</p>
                        <p className="text-xs text-slate-500">Security Analyst</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
