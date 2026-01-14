import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext: string;
  trend?: string;
  trendDirection?: "up" | "down";
  icon: LucideIcon;
  alert?: boolean;
}

export default function MetricCard({ 
  title, 
  value, 
  subtext, 
  trend, 
  trendDirection, 
  icon: Icon, 
  alert 
}: MetricCardProps) {
  const trendColor = trendDirection === "up" ? "text-green-600" : "text-red-500";
  const alertStyle = alert ? "border-l-4 border-l-red-500" : "";
  
  return (
    <div className={`bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 ${alertStyle}`}>
      <div className="flex justify-between items-start">
        <h3 className="text-xs font-semibold tracking-wider text-gray-500 uppercase">{title}</h3>
        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-1">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        {trend && trendDirection && (
          <span className={`flex items-center gap-0.5 font-medium ${trendColor}`}>
            {trendDirection === "up" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trend}
          </span>
        )}
        <span className="text-gray-400">{subtext}</span>
      </div>
    </div>
  );
}
