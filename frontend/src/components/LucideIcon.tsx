import {
  Languages,
  Code,
  Lightbulb,
  BarChart3,
  Bot,
  User,
  Send,
  Trash2,
  Trash,
  Plus,
  Settings,
  Search,
  X,
  ArrowRight,
  PlusCircle,
  Check,
  Copy,
  Cpu,
  Compass,
  MessageSquare,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  BookOpen,
  RotateCcw,
  ArrowUpRight,
  Edit3,
  RefreshCw,
  Paperclip,
  Mic,
  ArrowUp,
  Crown,
  Heart,
  Volume2,
  Award,
  Info
} from 'lucide-react';

interface LucideIconProps {
  name: string;
  className?: string;
  size?: number;
}

export default function LucideIcon({ name, className = '', size = 20 }: LucideIconProps) {
  switch (name) {
    case 'Languages':
      return <Languages className={className} size={size} />;
    case 'Code':
      return <Code className={className} size={size} />;
    case 'Lightbulb':
      return <Lightbulb className={className} size={size} />;
    case 'BarChart3':
      return <BarChart3 className={className} size={size} />;
    case 'Bot':
      return <Bot className={className} size={size} />;
    case 'User':
      return <User className={className} size={size} />;
    case 'Send':
      return <Send className={className} size={size} />;
    case 'Trash2':
      return <Trash2 className={className} size={size} />;
    case 'Trash':
      return <Trash className={className} size={size} />;
    case 'Plus':
      return <Plus className={className} size={size} />;
    case 'Settings':
      return <Settings className={className} size={size} />;
    case 'Search':
      return <Search className={className} size={size} />;
    case 'X':
      return <X className={className} size={size} />;
    case 'ArrowRight':
      return <ArrowRight className={className} size={size} />;
    case 'PlusCircle':
      return <PlusCircle className={className} size={size} />;
    case 'Check':
      return <Check className={className} size={size} />;
    case 'Copy':
      return <Copy className={className} size={size} />;
    case 'Cpu':
      return <Cpu className={className} size={size} />;
    case 'Compass':
      return <Compass className={className} size={size} />;
    case 'MessageSquare':
      return <MessageSquare className={className} size={size} />;
    case 'PanelLeftClose':
      return <PanelLeftClose className={className} size={size} />;
    case 'PanelLeftOpen':
      return <PanelLeftOpen className={className} size={size} />;
    case 'BookOpen':
      return <BookOpen className={className} size={size} />;
    case 'RotateCcw':
      return <RotateCcw className={className} size={size} />;
    case 'ArrowUpRight':
      return <ArrowUpRight className={className} size={size} />;
    case 'Edit3':
      return <Edit3 className={className} size={size} />;
    case 'RefreshCw':
      return <RefreshCw className={className} size={size} />;
    case 'Paperclip':
      return <Paperclip className={className} size={size} />;
    case 'Mic':
      return <Mic className={className} size={size} />;
    case 'ArrowUp':
      return <ArrowUp className={className} size={size} />;
    case 'Crown':
      return <Crown className={className} size={size} />;
    case 'Heart':
      return <Heart className={className} size={size} />;
    case 'Volume2':
      return <Volume2 className={className} size={size} />;
    case 'Award':
      return <Award className={className} size={size} />;
    case 'Info':
      return <Info className={className} size={size} />;
    default:
      return <HelpCircle className={className} size={size} />;
  }
}
