import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  Plus,
  ShieldCheck,
  Sparkles,
  Info,
  Sun,
  Moon,
  ExternalLink,
} from 'lucide-react';
import { SkincareProduct, RoutineStep } from '../types/skinAnalysis.ts';
import { fetchProducts, fetchUserRoutine, saveUserRoutine } from '../services/api.ts';

interface ProductExplorerProps {
  onNavigate: (tab: string) => void;
}

export const ProductExplorer: React.FC<ProductExplorerProps> = ({ onNavigate }) => {
  const [products, setProducts] = useState<SkincareProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [disclaimer, setDisclaimer] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBudget, setSelectedBudget] = useState<string>('all');
  const [selectedTime, setSelectedTime] = useState<string>('all');
  const [selectedConcern, setSelectedConcern] = useState<string>('all');
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await fetchProducts();
      setProducts(data.products || []);
      setDisclaimer(data.disclaimer || '');
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToRoutine = async (product: SkincareProduct) => {
    try {
      const routineData = await fetchUserRoutine();
      const currentAm = routineData.routine?.amSteps || [];
      const currentPm = routineData.routine?.pmSteps || [];

      const targetTime = product.timeOfDay === 'pm' ? 'pm' : 'am';

      const newStep: RoutineStep = {
        id: `step_${Date.now()}`,
        name: `${product.brand} - ${product.name}`,
        category: product.category,
        timeOfDay: targetTime,
        instructions: product.instructions,
        order: targetTime === 'am' ? currentAm.length + 1 : currentPm.length + 1,
        completedToday: false,
      };

      if (targetTime === 'am') {
        await saveUserRoutine([...currentAm, newStep], currentPm);
      } else {
        await saveUserRoutine(currentAm, [...currentPm, newStep]);
      }

      setAddedProductId(product.id);
      setTimeout(() => setAddedProductId(null), 3000);
    } catch (err) {
      console.error('Failed to add product to routine:', err);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matches =
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.keyIngredients.some((ing) => ing.toLowerCase().includes(q)) ||
        p.description.toLowerCase().includes(q);
      if (!matches) return false;
    }

    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
    if (selectedBudget !== 'all' && p.budget !== selectedBudget) return false;
    if (selectedTime !== 'all' && p.timeOfDay !== 'both' && p.timeOfDay !== selectedTime) return false;
    if (selectedConcern !== 'all' && !p.targetConcerns.includes(selectedConcern)) return false;

    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#4E6554] text-xs font-semibold mb-2">
          <Search className="w-3.5 h-3.5" />
          <span>Curated Ingredient & Formula Repository</span>
        </div>
        <h1 className="font-serif-heading text-3xl font-bold text-stone-900 tracking-tight">
          Skincare Product Explorer
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
          Explore verified formulations with transparent active ingredient breakdowns. Eudermia does not invent products, reviews, or affiliate links.
        </p>
      </div>

      {/* Filter Controls Bar */}
      <div className="skincare-card rounded-2xl p-5 bg-white border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
            <input
              type="text"
              placeholder="Search by ingredient (e.g. Ceramides, Azelaic Acid, Squalane)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#4E6554]"
            />
          </div>

          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
              setSelectedBudget('all');
              setSelectedTime('all');
              setSelectedConcern('all');
            }}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors shrink-0"
          >
            Clear Filters
          </button>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-stone-100 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-stone-500 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2 rounded-lg border border-stone-300 bg-white font-medium text-stone-800"
            >
              <option value="all">All Categories</option>
              <option value="cleanser">Cleansers</option>
              <option value="serum">Serums & Actives</option>
              <option value="treatment">Targeted Treatments</option>
              <option value="moisturizer">Moisturizers & Creams</option>
              <option value="sunscreen">Sunscreen (SPF)</option>
              <option value="eye_cream">Eye Care</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-500 mb-1">Skin Concern</label>
            <select
              value={selectedConcern}
              onChange={(e) => setSelectedConcern(e.target.value)}
              className="w-full p-2 rounded-lg border border-stone-300 bg-white font-medium text-stone-800"
            >
              <option value="all">All Concerns</option>
              <option value="acne">Acne & Blemishes</option>
              <option value="redness">Redness & Erythema</option>
              <option value="dryness">Dryness & Barrier</option>
              <option value="oiliness">Oiliness & Sebum</option>
              <option value="pigmentation">Pigmentation & Dark Spots</option>
              <option value="wrinkles">Wrinkles & Fine Lines</option>
              <option value="undereye">Dark Circles & Puffiness</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-500 mb-1">Time of Day</label>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full p-2 rounded-lg border border-stone-300 bg-white font-medium text-stone-800"
            >
              <option value="all">All Times</option>
              <option value="am">Morning (AM)</option>
              <option value="pm">Evening (PM)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-500 mb-1">Price Tier</label>
            <select
              value={selectedBudget}
              onChange={(e) => setSelectedBudget(e.target.value)}
              className="w-full p-2 rounded-lg border border-stone-300 bg-white font-medium text-stone-800"
            >
              <option value="all">All Tiers</option>
              <option value="$">$ (Under $15)</option>
              <option value="$$">$$ ($15 - $35)</option>
              <option value="$$$">$$$ ($35+)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-xs text-stone-500">Loading catalog...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 skincare-card rounded-2xl p-8 bg-stone-50 border border-stone-200">
          <Info className="w-8 h-8 text-stone-400 mx-auto mb-2" />
          <h3 className="font-semibold text-stone-800 text-sm">No Matching Formulations Found</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria or resetting filters to browse verified staple products.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const isAdded = addedProductId === product.id;
            return (
              <div
                key={product.id}
                className="skincare-card rounded-2xl p-6 bg-white border border-stone-200 flex flex-col justify-between hover:border-stone-300 transition-all shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                        {product.brand}
                      </span>
                      <h3 className="font-serif-heading text-base font-bold text-stone-900 mt-0.5 leading-snug">
                        {product.name}
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md shrink-0">
                      {product.budget}
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 mt-2.5 leading-relaxed">
                    {product.description}
                  </p>

                  {/* Key Actives */}
                  <div className="mt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Key Ingredients
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {product.keyIngredients.map((ing) => (
                        <span
                          key={ing}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-stone-100 text-stone-700"
                        >
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Safety & Patch Testing Guidance */}
                  <div className="mt-3 p-2.5 rounded-lg bg-stone-50 text-[11px] text-stone-500 border border-stone-100 space-y-1">
                    <p>
                      <strong>How to use:</strong> {product.instructions}
                    </p>
                    <p className="text-amber-800">
                      <strong>Patch test:</strong> {product.patchTestAdvice}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-stone-500 flex items-center gap-1">
                    {product.timeOfDay === 'am' ? (
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                    ) : product.timeOfDay === 'pm' ? (
                      <Moon className="w-3.5 h-3.5 text-indigo-500" />
                    ) : (
                      <>
                        <Sun className="w-3 h-3 text-amber-500" /> / <Moon className="w-3 h-3 text-indigo-500" />
                      </>
                    )}
                    {product.timeOfDay.toUpperCase()}
                  </span>

                  <button
                    onClick={() => handleAddToRoutine(product)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isAdded
                        ? 'bg-emerald-700 text-white'
                        : 'bg-stone-100 hover:bg-[#4E6554] hover:text-white text-stone-800'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isAdded ? 'Added to Routine!' : 'Add to Routine'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Catalog Transparency Notice */}
      <div className="rounded-2xl bg-stone-50 border border-stone-200/80 p-5 text-xs text-stone-500">
        <p className="leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-emerald-600 inline mr-1" />
          {disclaimer ||
            'Curated informational catalog of non-prescription skincare staples. Eudermia does not participate in paid brand sponsorships or affiliate link commissions.'}
        </p>
      </div>
    </div>
  );
};
