'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';


interface resourceGroup {
  name: string
  subscriptionId: string
  location: string
  cost: number
  budget: number
  autoStop: boolean    
};



export default function ResourceBudgetPage() {
  const { group } = useParams();
  console.log(group);
  const [budgetData, setBudgetData] = useState<resourceGroup| null>(null);
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [autoShut,setAutoShut]= useState(false);
  const [azureResources, setAzureResources] = useState<any[]>([]);
  const [dbApps, setDbApps] = useState<any[]>([]);
  const [tenantId, setTenantId] = useState<string>('');

  useEffect(() => {
    if (!group) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [res, resourcesRes] = await Promise.all([
          fetch(`/api/resourceGroup/budget/${group as string}`),
          fetch(`/api/resourceGroup/${group as string}/resources`)
        ]);
        
        const data = await res.json();
        if (res.ok) {
          setBudgetData(data.data);
          setAmount(data.data.budget);
          setAutoShut(data.data.autoShut);
        } else {
          setMessage('Budget not found or error fetching it');
        }

        const resourcesData = await resourcesRes.json();
        if (resourcesRes.ok && resourcesData.success) {
          setAzureResources(resourcesData.resources || []);
          setDbApps(resourcesData.dbApps || []);
          setTenantId(resourcesData.tenantId || '');
        }

      } catch (err) {
        setMessage('Error loading data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [group]);

  const handleResourceClick = (resource: any) => {
    // Check if it's one of our web apps tracked in MongoDB
    const app = dbApps.find(a => a.AppName === resource.name);
    if (app) {
      window.location.href = `/dashboard/monitor/${app._id}`;
      return;
    }

    // Otherwise, direct them to Azure Portal
    // Format: https://portal.azure.com/#@<tenantId>/resource<resourceId>
    const portalUrl = `https://portal.azure.com/#@${tenantId}/resource${resource.id}`;
    window.open(portalUrl, '_blank');
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/resourceGroup/budget/${group as string}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount,autoShut }),
      });

      const result = await res.json();
      if (res.ok) {
        setMessage('Budget updated successfully');
        setBudgetData(result);
      } else {
        setMessage(`Update failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      setMessage('Error updating budget');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Resource Budget Manager</h1>
      <p className="text-sm mb-4">Resource ID: <code className="text-blue-600">{group}</code></p>

      {loading && <p>Loading...</p>}

      {budgetData && (
        <div className="space-y-4">
          <div>
            <label className="block font-medium">Budget Name:</label>
            <p>{budgetData.name}</p>
          </div>
        
        <div>
            <label className='bloack font-medium'>BUDGET:</label>
            <h1>{budgetData.budget}</h1>
        </div>

         <div>
            <label className='bloack font-medium'>COST:</label>
            <h1>{budgetData.cost}</h1>
        </div>

          <div>
            <label className="block font-medium">Amount:</label>
            <input
              type="number"
              className="border p-2 w-full"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>

        <label className="flex items-center justify-evenly text-shadow-cyan-400">
            <span>Auto Shutdown</span>
            <div className="relative inline-block h-6 w-11">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={autoShut}
                onChange={(e) => setAutoShut(e.target.checked)}
              />
              <div className="h-6 w-11 rounded-full bg-blue-300 transition peer-checked:bg-green-700" />
              <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
            </div>
          </label>


          <button
            onClick={handleUpdate}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Update Budget
          </button>
          <button
            onClick={async () => {
              if (!confirm("Are you sure you want to delete this resource group AND all apps inside it? This action is irreversible on Azure!")) return;
              setLoading(true);
              try {
                const res = await fetch(`/api/resourceGroup/budget/${group as string}`, { method: 'DELETE' });
                const result = await res.json();
                if (res.ok) {
                  alert('Resource group deleted successfully!');
                  window.location.href = "/dashboard";
                } else {
                  setMessage(`Delete failed: ${result.error || result.message || 'Unknown error'}`);
                }
              } catch (err) {
                setMessage('Error deleting resource group');
              } finally {
                setLoading(false);
              }
            }}
            className="bg-red-600 text-white px-4 py-2 ml-4 rounded hover:bg-red-700"
          >
            Delete Resource Group
          </button>

          {message && <p className="text-sm text-gray-600 mt-4">{message}</p>}
        </div>
      )}

      {/* Azure Resources Inventory */}
      {budgetData && (
        <div className="mt-8 border-t pt-6">
          <h2 className="text-xl font-bold mb-4">Azure Resources ({azureResources.length})</h2>
          {azureResources.length === 0 ? (
            <p className="text-gray-500 italic">No resources found in this group.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {azureResources.map((res) => {
                const isWebApp = dbApps.some(a => a.AppName === res.name);
                return (
                  <div 
                    key={res.id} 
                    onClick={() => handleResourceClick(res)}
                    className={`border p-4 rounded-lg shadow-sm cursor-pointer transition-colors ${isWebApp ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                  >
                    <h3 className="font-semibold text-lg">{res.name}</h3>
                    <p className="text-xs text-gray-500 mb-2 truncate" title={res.type}>{res.type}</p>
                    <div className="flex justify-between items-center text-sm">
                      <span className="bg-gray-200 px-2 py-1 rounded text-gray-700">{res.location}</span>
                      {isWebApp ? (
                        <span className="text-blue-600 text-xs font-medium bg-blue-100 px-2 py-1 rounded">☁️ CloudGuard App</span>
                      ) : (
                        <span className="text-gray-600 text-xs font-medium flex items-center gap-1">
                          External Resource ↗
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!budgetData && !loading && (
        <p className="text-red-600">{message || 'No budget data available'}</p>
      )}
    </div>
  );
}
