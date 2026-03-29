import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Filter, 
  Calendar, 
  MapPin, 
  Wheat, 
  PawPrint, 
  Euro, 
  AreaChart as AreaChartIcon,
  Search,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  FileText,
  AlertCircle,
  Download,
  RotateCcw
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  ComposedChart,
  Area,
  Line,
  Legend
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import rawData from './degats_ug_tardenois.json';

// --- Types ---
interface DamageRecord {
  campagne: string;
  dossier: string;
  type: 'Dégâts' | 'Travaux';
  commune: string;
  exploitation: string;
  culture: string;
  surface_detruite: number;
  montant_sollicite: number;
  espece: string;
  date_apparition: string;
  lieu_dit: string;
}

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const formatEuro = (val: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);
const formatNumber = (val: number) => new Intl.NumberFormat('fr-FR').format(val);

// --- Components ---

const KPICard = ({ title, value, unit, icon: Icon, colorClass }: { title: string, value: string | number, unit?: string, icon: any, colorClass: string }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</p>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        {unit && <span className="text-sm text-slate-500 font-medium">{unit}</span>}
      </div>
    </div>
    <div className={cn("p-3 rounded-lg", colorClass)}>
      <Icon size={24} className="text-white" />
    </div>
  </div>
);

export default function App() {
  // --- State ---
  const [data] = useState<DamageRecord[]>(() => 
    (rawData as DamageRecord[]).map(d => ({
      ...d,
      commune: d.commune
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/-/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    }))
  );
  const [filters, setFilters] = useState({
    campagne: 'Toutes',
    type: 'Toutes',
    commune: 'Toutes',
    culture: 'Toutes',
    espece: 'Toutes',
    search: ''
  });
  const [sortConfig, setSortConfig] = useState<{ key: keyof DamageRecord, direction: 'asc' | 'desc' } | null>(null);

  // --- Derived Data ---
  const uniqueValues = useMemo(() => ({
    campagnes: ['Toutes', ...new Set(data.map(d => d.campagne))].sort().reverse(),
    types: ['Toutes', ...new Set(data.map(d => d.type))].sort(),
    communes: ['Toutes', ...new Set(data.map(d => d.commune))].sort(),
    cultures: ['Toutes', ...new Set(data.map(d => d.culture))].sort(),
    especes: ['Toutes', ...new Set(data.map(d => d.espece))].sort()
  }), [data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchCampagne = filters.campagne === 'Toutes' || item.campagne === filters.campagne;
      const matchType = filters.type === 'Toutes' || item.type === filters.type;
      const matchCommune = filters.commune === 'Toutes' || item.commune === filters.commune;
      const matchCulture = filters.culture === 'Toutes' || item.culture === filters.culture;
      const matchEspece = filters.espece === 'Toutes' || item.espece === filters.espece;
      const matchSearch = filters.search === '' || 
        item.exploitation.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.dossier.toLowerCase().includes(filters.search.toLowerCase());
      
      return matchCampagne && matchType && matchCommune && matchCulture && matchEspece && matchSearch;
    }).sort((a, b) => {
      if (!sortConfig) return 0;
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, filters, sortConfig]);

  // --- Chart Data ---
  const communeData = useMemo(() => {
    // For the commune chart, we want to see all communes even if one is selected in the filters
    // but we still want to respect other filters (campagne, type, etc.)
    const chartFilteredData = data.filter(item => {
      const matchCampagne = filters.campagne === 'Toutes' || item.campagne === filters.campagne;
      const matchType = filters.type === 'Toutes' || item.type === filters.type;
      const matchCulture = filters.culture === 'Toutes' || item.culture === filters.culture;
      const matchEspece = filters.espece === 'Toutes' || item.espece === filters.espece;
      const matchSearch = filters.search === '' || 
        item.exploitation.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.dossier.toLowerCase().includes(filters.search.toLowerCase());
      return matchCampagne && matchType && matchCulture && matchEspece && matchSearch;
    });

    const stats: Record<string, { montant: number; count: number }> = {};
    chartFilteredData.forEach(d => {
      if (!stats[d.commune]) {
        stats[d.commune] = { montant: 0, count: 0 };
      }
      stats[d.commune].montant += d.montant_sollicite;
      stats[d.commune].count += 1;
    });
    return Object.entries(stats)
      .map(([name, { montant, count }]) => ({ name, value: montant, count }))
      .sort((a, b) => b.value - a.value);
  }, [data, filters]);

  const cultureData = useMemo(() => {
    const stats: Record<string, { montant: number; count: number }> = {};
    filteredData.forEach(d => {
      if (!stats[d.culture]) {
        stats[d.culture] = { montant: 0, count: 0 };
      }
      stats[d.culture].montant += d.montant_sollicite;
      stats[d.culture].count += 1;
    });
    return Object.entries(stats)
      .map(([name, { montant, count }]) => ({ name, value: montant, count }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // --- KPIs ---
  const kpis = useMemo(() => {
    const totalDossiers = filteredData.length;
    const nbDegats = filteredData.filter(d => d.type === 'Dégâts').length;
    const nbTravaux = filteredData.filter(d => d.type === 'Travaux').length;
    const totalSurfaceCulture = filteredData
      .filter(d => d.type === 'Dégâts')
      .reduce((acc, curr) => acc + curr.surface_detruite, 0);
    const totalSurfaceTravaux = filteredData
      .filter(d => d.type === 'Travaux')
      .reduce((acc, curr) => acc + curr.surface_detruite, 0);
    const totalMontantCulture = filteredData
      .filter(d => d.type === 'Dégâts')
      .reduce((acc, curr) => acc + curr.montant_sollicite, 0);
    const totalMontantTravaux = filteredData
      .filter(d => d.type === 'Travaux')
      .reduce((acc, curr) => acc + curr.montant_sollicite, 0);
    const totalMontant = totalMontantCulture + totalMontantTravaux;

    const pctDegats = totalDossiers > 0 ? (nbDegats / totalDossiers) * 100 : 0;
    const pctTravaux = totalDossiers > 0 ? (nbTravaux / totalDossiers) * 100 : 0;

    const topCommune = communeData.length > 0 ? communeData[0].name : 'N/A';
    const topCulture = cultureData.length > 0 ? cultureData[0].name : 'N/A';

    return {
      totalDossiers,
      nbDegats,
      nbTravaux,
      pctDegats,
      pctTravaux,
      totalSurfaceCulture: totalSurfaceCulture.toFixed(2),
      totalSurfaceTravaux: totalSurfaceTravaux.toFixed(2),
      totalMontantCulture,
      totalMontantTravaux,
      totalMontant,
      topCommune,
      topCulture
    };
  }, [filteredData, communeData, cultureData]);

  const typeData = useMemo(() => {
    const groups: Record<string, { name: string; value: number; count: number }> = {};
    filteredData.forEach(record => {
      if (!groups[record.type]) {
        groups[record.type] = { name: record.type, value: 0, count: 0 };
      }
      groups[record.type].value += record.montant_sollicite;
      groups[record.type].count += 1;
    });
    return Object.values(groups);
  }, [filteredData]);

  const especeData = useMemo(() => {
    const stats: Record<string, { montant: number; count: number }> = {};
    filteredData.forEach(d => {
      if (!stats[d.espece]) {
        stats[d.espece] = { montant: 0, count: 0 };
      }
      stats[d.espece].montant += d.montant_sollicite;
      stats[d.espece].count += 1;
    });
    return Object.entries(stats).map(([name, { montant, count }]) => ({ name, value: montant, count }));
  }, [filteredData]);

  const monthlyCumulativeData = useMemo(() => {
    const monthlyTotals: Record<string, number> = {};
    
    filteredData.forEach(d => {
      const month = d.date_apparition.substring(0, 7); // Format YYYY-MM
      monthlyTotals[month] = (monthlyTotals[month] || 0) + d.montant_sollicite;
    });

    const sortedMonths = Object.keys(monthlyTotals).sort();
    let cumulative = 0;
    
    return sortedMonths.map(month => {
      cumulative += monthlyTotals[month];
      const [year, m] = month.split('-');
      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
      return {
        month: `${monthNames[parseInt(m) - 1]} ${year}`,
        montant: monthlyTotals[month],
        cumul: cumulative
      };
    });
  }, [filteredData]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const handleSort = (key: keyof DamageRecord) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const exportToCSV = () => {
    const headers = ['Dossier', 'Type', 'Commune', 'Lieu-dit', 'Exploitation', 'Culture', 'Surface (ha)', 'Montant (€)', 'Espèce', 'Date'];
    const rows = filteredData.map(d => [
      d.dossier,
      d.type,
      d.commune,
      `"${d.lieu_dit}"`,
      `"${d.exploitation}"`,
      d.culture,
      d.surface_detruite,
      d.montant_sollicite,
      d.espece,
      d.date_apparition
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `export_degats_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <LayoutDashboard className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Tableau de bord dégâts – UG Tardenois</h1>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Pilotage cynégétique et financier</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
            <Calendar size={16} />
            <span>Campagne active : <span className="font-semibold text-slate-900">{filters.campagne === 'Toutes' ? 'Global' : filters.campagne}</span></span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        
        {/* Filters Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <Filter size={20} className="text-emerald-600" />
            <h2 className="font-semibold text-slate-800">Filtres dynamiques</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Campagne</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={filters.campagne}
                onChange={(e) => setFilters(f => ({ ...f, campagne: e.target.value }))}
              >
                {uniqueValues.campagnes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Type Dossier</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={filters.type}
                onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}
              >
                {uniqueValues.types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Commune</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={filters.commune}
                onChange={(e) => setFilters(f => ({ ...f, commune: e.target.value }))}
              >
                {uniqueValues.communes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Culture</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={filters.culture}
                onChange={(e) => setFilters(f => ({ ...f, culture: e.target.value }))}
              >
                {uniqueValues.cultures.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Espèce</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={filters.espece}
                onChange={(e) => setFilters(f => ({ ...f, espece: e.target.value }))}
              >
                {uniqueValues.especes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Recherche</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Exploitation, dossier..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  value={filters.search}
                  onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5 flex flex-col justify-end gap-2">
              <button 
                onClick={exportToCSV}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg text-xs transition-colors flex items-center justify-center gap-2"
              >
                <Download size={14} /> Exporter CSV
              </button>
              <button 
                onClick={() => setFilters({
                  campagne: 'all',
                  type: 'all',
                  commune: 'all',
                  culture: 'all',
                  espece: 'all',
                  search: ''
                })}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 px-4 rounded-lg text-xs transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} /> Réinitialiser
              </button>
            </div>
          </div>
        </section>

        {/* KPI Section */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Dossiers</p>
            <div className="flex items-end justify-between mb-2">
              <span className="text-2xl font-bold text-slate-900">{kpis.totalDossiers}</span>
              <div className="text-[10px] text-slate-500 font-medium flex flex-col items-end">
                <span className="text-amber-600">{kpis.nbDegats} Dégâts ({kpis.pctDegats.toFixed(0)}%)</span>
                <span className="text-blue-600">{kpis.nbTravaux} Travaux ({kpis.pctTravaux.toFixed(0)}%)</span>
              </div>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-amber-500" style={{ width: `${kpis.pctDegats}%` }} />
              <div className="h-full bg-blue-500" style={{ width: `${kpis.pctTravaux}%` }} />
            </div>
          </div>
          <KPICard title="Surface Culture Estimée" value={kpis.totalSurfaceCulture} unit="ha" icon={AreaChartIcon} colorClass="bg-emerald-500" />
          <KPICard title="Surface Travaux Estimée" value={kpis.totalSurfaceTravaux} unit="ha" icon={AreaChartIcon} colorClass="bg-blue-500" />
          <KPICard title="Montant Culture Estimé" value={formatEuro(kpis.totalMontantCulture)} icon={Euro} colorClass="bg-rose-500" />
          <KPICard title="Montant Travaux Estimé" value={formatEuro(kpis.totalMontantTravaux)} icon={Euro} colorClass="bg-indigo-500" />
          <KPICard title="Top Commune" value={kpis.topCommune} icon={MapPin} colorClass="bg-amber-500" />
          <KPICard title="Top Culture" value={kpis.topCulture} icon={Wheat} colorClass="bg-emerald-600" />
          <div className="bg-emerald-600 p-4 rounded-xl shadow-md flex items-center gap-3 text-white">
            <MapPin size={24} />
            <div>
              <p className="text-[10px] font-bold uppercase opacity-80">Unité de Gestion</p>
              <p className="text-lg font-bold">Tardenois</p>
            </div>
          </div>
        </section>

        {/* Map Section */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
            <MapPin size={18} className="text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-sm">Cartographie SIG - Naturagora</h3>
          </div>
          <div className="w-full aspect-[16/9] md:aspect-[21/9] min-h-[450px]">
            <iframe 
              width="100%" 
              height="100%" 
              frameBorder="0" 
              style={{ border: 0 }} 
              src="https://sig.naturagora.fr/index.php/view/embed?repository=aisne&project=001_degat_gg_ug#3.328426,49.114199,3.858997,49.293768|Unit%C3%A9s%20de%20gestion,D%C3%A9clarations%20-%20Communes%20-%2072%20h,D%C3%A9clarations%20-%20Communes%20-%20Ann%C3%A9e%20n|d%C3%A9faut,d%C3%A9faut,d%C3%A9faut|1,1,1" 
              allowFullScreen
            ></iframe>
          </div>
        </section>

        {/* Charts Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chart 1: Par Commune */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <MapPin size={18} className="text-emerald-600" />
                Montants par Commune
              </h3>
            </div>
            <div className="h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={communeData} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={160} 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: '#334155', fontWeight: 600 }}
                  />
                  <Tooltip 
                    formatter={(val: number, name: string, props: any) => {
                      if (name === 'value') return [formatEuro(val), 'Montant'];
                      return [val, name];
                    }}
                    labelFormatter={(label) => `Commune: ${label}`}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-100">
                            <p className="font-bold text-slate-800 mb-1">{label}</p>
                            <p className="text-xs text-slate-600 flex justify-between gap-4">
                              <span>Montant:</span>
                              <span className="font-bold text-emerald-600">{formatEuro(data.value)}</span>
                            </p>
                            <p className="text-xs text-slate-600 flex justify-between gap-4">
                              <span>Dossiers:</span>
                              <span className="font-bold text-slate-900">{data.count}</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Par Culture */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Wheat size={18} className="text-emerald-600" />
                Répartition par Culture
              </h3>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cultureData}
                    cx="40%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {cultureData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-100">
                            <p className="font-bold text-slate-800 mb-1">{data.name}</p>
                            <p className="text-xs text-slate-600 flex justify-between gap-4">
                              <span>Montant:</span>
                              <span className="font-bold text-emerald-600">{formatEuro(data.value)}</span>
                            </p>
                            <p className="text-xs text-slate-600 flex justify-between gap-4">
                              <span>Dossiers:</span>
                              <span className="font-bold text-slate-900">{data.count}</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    wrapperStyle={{ paddingLeft: '20px', fontSize: '12px', fontWeight: 500, color: '#1e293b' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Par Espèce */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <PawPrint size={18} className="text-emerald-600" />
                Répartition par Espèce
              </h3>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={especeData}
                    cx="40%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {especeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-100">
                            <p className="font-bold text-slate-800 mb-1">{data.name}</p>
                            <p className="text-xs text-slate-600 flex justify-between gap-4">
                              <span>Montant:</span>
                              <span className="font-bold text-emerald-600">{formatEuro(data.value)}</span>
                            </p>
                            <p className="text-xs text-slate-600 flex justify-between gap-4">
                              <span>Dossiers:</span>
                              <span className="font-bold text-slate-900">{data.count}</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    wrapperStyle={{ paddingLeft: '20px', fontSize: '12px', fontWeight: 500, color: '#1e293b' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Par Type de Dossier */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <FileText size={18} className="text-emerald-600" />
                Répartition Dégâts / Travaux
              </h3>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="40%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Dégâts' ? '#f59e0b' : '#3b82f6'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-100">
                            <p className="font-bold text-slate-800 mb-1">{data.name}</p>
                            <p className="text-xs text-slate-600 flex justify-between gap-4">
                              <span>Montant:</span>
                              <span className="font-bold text-emerald-600">{formatEuro(data.value)}</span>
                            </p>
                            <p className="text-xs text-slate-600 flex justify-between gap-4">
                              <span>Dossiers:</span>
                              <span className="font-bold text-slate-900">{data.count}</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    wrapperStyle={{ paddingLeft: '20px', fontSize: '12px', fontWeight: 500, color: '#1e293b' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 5: Évolution Mensuelle */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <AreaChartIcon size={18} className="text-emerald-600" />
                Évolution Mensuelle (Dates de Déclaration)
              </h3>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyCumulativeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" fontSize={10} />
                  <YAxis yAxisId="left" fontSize={12} tickFormatter={(val) => `${val}€`} />
                  <YAxis yAxisId="right" orientation="right" fontSize={12} tickFormatter={(val) => `${val}€`} />
                  <Tooltip 
                    formatter={(val: number, name: string) => [formatEuro(val), name === 'cumul' ? 'Cumul' : 'Mensuel']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar yAxisId="left" dataKey="montant" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} name="Mensuel" />
                  <Area 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="cumul" 
                    fill="#10b981" 
                    stroke="#10b981" 
                    fillOpacity={0.1}
                    strokeWidth={3} 
                    name="Cumul"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Table Section */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Détail des dossiers</h3>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
              {filteredData.length} dossier(s) affiché(s)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className={cn("px-6 py-4 cursor-pointer hover:text-emerald-600 transition-colors", sortConfig?.key === 'dossier' && "bg-slate-100 text-emerald-600")} onClick={() => handleSort('dossier')}>
                    <div className="flex items-center gap-1">Dossier <ArrowUpDown size={12} /></div>
                  </th>
                  <th className={cn("px-6 py-4 cursor-pointer hover:text-emerald-600 transition-colors", sortConfig?.key === 'type' && "bg-slate-100 text-emerald-600")} onClick={() => handleSort('type')}>
                    <div className="flex items-center gap-1">Type <ArrowUpDown size={12} /></div>
                  </th>
                  <th className={cn("px-6 py-4 cursor-pointer hover:text-emerald-600 transition-colors", sortConfig?.key === 'commune' && "bg-slate-100 text-emerald-600")} onClick={() => handleSort('commune')}>
                    <div className="flex items-center gap-1">Commune <ArrowUpDown size={12} /></div>
                  </th>
                  <th className={cn("px-6 py-4 cursor-pointer hover:text-emerald-600 transition-colors", sortConfig?.key === 'lieu_dit' && "bg-slate-100 text-emerald-600")} onClick={() => handleSort('lieu_dit')}>
                    <div className="flex items-center gap-1">Lieu-dit <ArrowUpDown size={12} /></div>
                  </th>
                  <th className={cn("px-6 py-4 cursor-pointer hover:text-emerald-600 transition-colors", sortConfig?.key === 'exploitation' && "bg-slate-100 text-emerald-600")} onClick={() => handleSort('exploitation')}>
                    <div className="flex items-center gap-1">Exploitation <ArrowUpDown size={12} /></div>
                  </th>
                  <th className={cn("px-6 py-4 cursor-pointer hover:text-emerald-600 transition-colors", sortConfig?.key === 'culture' && "bg-slate-100 text-emerald-600")} onClick={() => handleSort('culture')}>
                    <div className="flex items-center gap-1">Culture <ArrowUpDown size={12} /></div>
                  </th>
                  <th className={cn("px-6 py-4 cursor-pointer hover:text-emerald-600 transition-colors text-right", sortConfig?.key === 'surface_detruite' && "bg-slate-100 text-emerald-600")} onClick={() => handleSort('surface_detruite')}>
                    <div className="flex items-center justify-end gap-1">Surface (ha) <ArrowUpDown size={12} /></div>
                  </th>
                  <th className={cn("px-6 py-4 cursor-pointer hover:text-emerald-600 transition-colors text-right", sortConfig?.key === 'montant_sollicite' && "bg-slate-100 text-emerald-600")} onClick={() => handleSort('montant_sollicite')}>
                    <div className="flex items-center justify-end gap-1">Montant <ArrowUpDown size={12} /></div>
                  </th>
                  <th className={cn("px-6 py-4 cursor-pointer hover:text-emerald-600 transition-colors", sortConfig?.key === 'espece' && "bg-slate-100 text-emerald-600")} onClick={() => handleSort('espece')}>
                    <div className="flex items-center gap-1">Espèce <ArrowUpDown size={12} /></div>
                  </th>
                  <th className={cn("px-6 py-4 cursor-pointer hover:text-emerald-600 transition-colors", sortConfig?.key === 'date_apparition' && "bg-slate-100 text-emerald-600")} onClick={() => handleSort('date_apparition')}>
                    <div className="flex items-center gap-1">Date Décl. <ArrowUpDown size={12} /></div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors text-[12px]">
                    <td className="px-6 py-4 font-bold text-slate-900">{item.dossier}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full font-bold uppercase text-[9px] border",
                        item.type === 'Dégâts' ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200"
                      )}>
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{item.commune}</td>
                    <td className="px-6 py-4 text-slate-600 italic">{item.lieu_dit}</td>
                    <td className="px-6 py-4 text-slate-600">{item.exploitation}</td>
                    <td className="px-6 py-4">
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md text-[11px] font-bold border border-emerald-100">
                        {item.culture}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-600">{item.surface_detruite.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">{formatEuro(item.montant_sollicite)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-md text-[11px] font-bold border",
                        item.espece === 'Sanglier' ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-blue-50 text-blue-700 border-blue-100"
                      )}>
                        {item.espece}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{item.date_apparition.split('-').reverse().join('/')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-xs">
        <p>© 2026 - Unité de Gestion du Tardenois - Fédération Départementale des Chasseurs</p>
        <p>Source des données : Extractions PDF Google Drive « Dégâts UG Tardenois »</p>
      </footer>
    </div>
  );
}
