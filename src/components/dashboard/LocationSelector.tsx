import React, { useState } from 'react';
import { CAMPUS_DESTINATIONS, DestinationLocation } from '../../lib/constants';
import {
  Train,
  Plane,
  Building2,
  MapPin,
  Bus,
  CheckCircle2,
  Navigation,
  ArrowRight,
  Sparkles,
  Search,
} from 'lucide-react';

interface LocationSelectorProps {
  selectedDestination: string;
  onSelectDestination: (destName: string) => void;
  onConfirmAndContinue?: () => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  selectedDestination,
  onSelectDestination,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'transit' | 'city' | 'nearby'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const getLocationIcon = (id: string) => {
    switch (id) {
      case 'vijayawada-station':
        return <Train className="w-5 h-5" />;
      case 'vijayawada':
      case 'guntur':
        return <Building2 className="w-5 h-5" />;
      case 'mangalagiri':
      case 'tadepalli':
      case 'amaravati':
      default:
        return <MapPin className="w-5 h-5" />;
    }
  };

  const filteredLocations = CAMPUS_DESTINATIONS.filter((dest) => {
    const matchesCat = activeCategory === 'all' || dest.category === activeCategory;
    const matchesQuery =
      !searchQuery.trim() ||
      dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dest.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const selectedLocationObj = CAMPUS_DESTINATIONS.find((d) => d.name === selectedDestination) || CAMPUS_DESTINATIONS[0];

  return (
    <div className="space-y-4 pb-24 sm:pb-0">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#245C3A] text-white flex items-center justify-center text-xs font-extrabold shrink-0 shadow-xs">
            1
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#183F2A] tracking-tight">
              Where are you traveling from campus gate?
            </h3>
            <p className="text-xs text-[#737B73]">
              Select your destination to group up with peers heading the same way.
            </p>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Pills */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Vijayawada station, airport, Mangalagiri, Tenali..."
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white border border-gray-200 text-xs text-[#171A17] focus:outline-none focus:ring-2 focus:ring-[#245C3A] shadow-2xs placeholder-gray-400"
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'All Destinations' },
            { id: 'transit', label: '🚂 Transit (Station & Airport)' },
            { id: 'city', label: '🏙️ City & Malls' },
            { id: 'nearby', label: '📍 Nearby & Town' },
          ].map((cat) => {
            const isCatActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isCatActive
                    ? 'bg-[#183F2A] text-white shadow-xs'
                    : 'bg-white hover:bg-gray-100 text-[#737B73] border border-gray-200'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Location Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredLocations.map((dest) => {
          const isSelected = selectedDestination === dest.name;
          return (
            <div
              key={dest.id}
              onClick={() => onSelectDestination(dest.name)}
              className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer relative overflow-hidden select-none active:scale-[0.99] ${
                isSelected
                  ? 'bg-[#FFFEFA] border-[#245C3A] ring-2 ring-[#245C3A]/25 shadow-md'
                  : 'bg-[#FFFEFA] border-gray-200/90 hover:border-[#245C3A]/40 shadow-2xs hover:shadow-xs'
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 text-[#245C3A]">
                  <CheckCircle2 className="w-5 h-5 fill-[#245C3A] text-white" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-3 mb-2.5">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors shrink-0 ${
                      isSelected
                        ? 'bg-[#183F2A] text-white'
                        : 'bg-[#F1F7F0] text-[#245C3A]'
                    }`}
                  >
                    {getLocationIcon(dest.id)}
                  </div>
                  <div className="min-w-0 pr-6">
                    <h4 className="text-sm font-bold text-[#183F2A] tracking-tight truncate">
                      {dest.name}
                    </h4>
                    <span className="inline-block text-[10px] font-semibold text-[#245C3A] bg-[#F1F7F0] px-2 py-0.5 rounded-md mt-0.5">
                      {dest.approxDistance}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-[#737B73] line-clamp-2 leading-relaxed">
                  {dest.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

