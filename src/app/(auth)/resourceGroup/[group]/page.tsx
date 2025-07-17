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

  useEffect(() => {
    if (!group) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/resourceGroup/budget/${group as string}`);
        const data = await res.json();
        if (res.ok) {
          console.log(data.data);
          setBudgetData(data.data);
          setAmount(data.data.budget);
          setAutoShut(data.data.autoShut)
        } else {
          setMessage('Budget not found or error fetching it');
        }
      } catch (err) {
        setMessage('Error loading data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [group]);

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

          {message && <p className="text-sm text-gray-600">{message}</p>}
        </div>
      )}

      {!budgetData && !loading && (
        <p className="text-red-600">{message || 'No budget data available'}</p>
      )}
    </div>
  );
}
