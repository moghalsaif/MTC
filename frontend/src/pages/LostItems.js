import { useState, useEffect } from 'react';
import axios from 'axios';
import { PackageX, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function LostItems() {
  const [lostItems, setLostItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLostItems();
  }, []);

  const fetchLostItems = async () => {
    try {
      const response = await axios.get(`${API}/lost-items`);
      setLostItems(response.data);
    } catch (error) {
      console.error('Failed to fetch lost items:', error);
      toast.error('Failed to load lost items');
    } finally {
      setLoading(false);
    }
  };

  const markRecovered = async (lostItemId) => {
    try {
      await axios.patch(`${API}/lost-items/${lostItemId}`);
      toast.success('Item marked as recovered');
      fetchLostItems();
    } catch (error) {
      console.error('Failed to mark recovered:', error);
      toast.error('Failed to update item');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-white font-data">LOADING LOST ITEMS...</div>
      </div>
    );
  }

  const unresolvedItems = lostItems.filter(item => !item.recovered);
  const recoveredItems = lostItems.filter(item => item.recovered);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-4xl font-black text-white tracking-tight" data-testid="lost-items-title">
          LOST ITEMS
        </h1>
        <p className="text-[#A1A1AA] mt-2">{unresolvedItems.length} unresolved, {recoveredItems.length} recovered</p>
      </div>

      {unresolvedItems.length === 0 && recoveredItems.length === 0 ? (
        <div className="bg-[#27272A] border border-[#3F3F46] rounded-2xl p-12 text-center" data-testid="no-lost-items">
          <CheckCircle size={48} className="mx-auto text-[#10B981] mb-4" />
          <div className="text-white text-lg font-medium mb-2">No lost items</div>
          <div className="text-[#A1A1AA]">All equipment is accounted for</div>
        </div>
      ) : (
        <>
          {unresolvedItems.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-heading text-2xl font-bold text-white">UNRESOLVED</h2>
              {unresolvedItems.map((item) => (
                <div
                  key={item.id}
                  data-testid={`lost-item-${item.id}`}
                  className="bg-[#27272A] border border-[#EF4444] rounded-2xl p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <PackageX className="text-[#EF4444]" size={20} />
                        <h3 className="text-white font-heading text-xl font-bold">{item.item_name}</h3>
                        <span className="bg-red-950/30 text-red-400 border-red-900 border font-mono text-xs uppercase tracking-widest px-2 py-1 rounded-2xl">
                          MISSING
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-[#71717A] text-xs uppercase tracking-wider mb-1">Quantity Lost</div>
                          <div className="text-white font-data font-bold">{item.quantity_lost}</div>
                        </div>
                        <div>
                          <div className="text-[#71717A] text-xs uppercase tracking-wider mb-1">Project</div>
                          <div className="text-white">{item.project_name}</div>
                        </div>
                        <div>
                          <div className="text-[#71717A] text-xs uppercase tracking-wider mb-1">Date Lost</div>
                          <div className="text-white">{new Date(item.date_lost).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => markRecovered(item.id)}
                      data-testid={`mark-recovered-${item.id}`}
                      className="bg-[#10B981] hover:bg-[#10B981]/90 text-white font-bold uppercase tracking-wider rounded-2xl ml-4"
                    >
                      <CheckCircle size={16} className="mr-2" />
                      Mark Recovered
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {recoveredItems.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-heading text-2xl font-bold text-white">RECOVERED</h2>
              {recoveredItems.map((item) => (
                <div
                  key={item.id}
                  data-testid={`recovered-item-${item.id}`}
                  className="bg-[#27272A] border border-[#3F3F46] rounded-2xl p-6 opacity-60"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <CheckCircle className="text-[#10B981]" size={20} />
                    <h3 className="text-white font-heading text-xl font-bold">{item.item_name}</h3>
                    <span className="bg-emerald-950/30 text-emerald-400 border-emerald-900 border font-mono text-xs uppercase tracking-widest px-2 py-1 rounded-2xl">
                      RECOVERED
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-[#71717A] text-xs uppercase tracking-wider mb-1">Quantity</div>
                      <div className="text-white font-data">{item.quantity_lost}</div>
                    </div>
                    <div>
                      <div className="text-[#71717A] text-xs uppercase tracking-wider mb-1">Project</div>
                      <div className="text-white">{item.project_name}</div>
                    </div>
                    <div>
                      <div className="text-[#71717A] text-xs uppercase tracking-wider mb-1">Date Lost</div>
                      <div className="text-white">{new Date(item.date_lost).toLocaleDateString()}</div>
                    </div>
                    {item.recovered_at && (
                      <div>
                        <div className="text-[#71717A] text-xs uppercase tracking-wider mb-1">Recovered On</div>
                        <div className="text-white">{new Date(item.recovered_at).toLocaleDateString()}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}