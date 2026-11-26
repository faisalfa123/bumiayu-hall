import {
  Activity,
  Box,
  Brain,
  Cpu,
  Film,
  Globe,
  Home,
  LayoutGrid,
  Shield,
  Terminal,
} from 'lucide-react';

export function AppIcon({ name, className = 'w-8 h-8' }: { name: string; className?: string }) {
  switch (name.toLowerCase()) {
    case 'brain':
      return <Brain className={className} />;
    case 'box':
      return <Box className={className} />;
    case 'shield':
      return <Shield className={className} />;
    case 'film':
      return <Film className={className} />;
    case 'home':
      return <Home className={className} />;
    case 'cpu':
      return <Cpu className={className} />;
    case 'terminal':
      return <Terminal className={className} />;
    case 'globe':
      return <Globe className={className} />;
    case 'activity':
      return <Activity className={className} />;
    default:
      return <LayoutGrid className={className} />;
  }
}
