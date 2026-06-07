import fs from 'fs';

const filePath = 'src/components/AdminConsole.tsx';
let data = fs.readFileSync(filePath, 'utf8');

// Normalize all CRLF to LF
data = data.replace(/\r\n/g, '\n');

// Let's replace the block containing subscription plans map with the edit-friendly layout
const targetBlock = `            <div className="space-y-3">
               <h4 className="text-[11px] uppercase font-mono text-white mb-2 font-bold tracking-widest pl-1 border-l-2 border-cyan-500">Active Membership Packages</h4>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                 {subscriptionPlans.map(plan => (
                   <div key={plan.id} className="p-5 rounded-2xl border border-white/10 bg-slate-900/50 relative overflow-hidden group">
                      {plan.isFree && <div className="absolute top-0 right-0 bg-emerald-500 text-black text-[9px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">Free Trial</div>}
                      <div className="flex justify-between items-start mb-3">
                         <h5 className="font-bold text-cyan-400 tracking-wide">{plan.title}</h5>
                      </div>
                      <div className="mb-4">
                         <span className="text-2xl font-bold text-white">\${plan.priceUsd}</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed min-h-[40px]">{plan.durationLabel}</p>
                      
                      <div className="mt-4 flex gap-2 w-full pt-4 border-t border-white/5 disabled opacity-20 pointer-events-none hidden">
                          {/* Edit disabled for now, mock UI */}
                      </div>
                      <button onClick={() => setSubscriptionPlans(prev => prev.filter(p => p.id !== plan.id))} className="cursor-pointer w-full mt-4 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 py-2 rounded font-mono text-[10px] font-bold uppercase transition flex items-center justify-center gap-2">
                         <Trash2 className="w-3.5 h-3.5" /> Remove Plan
                      </button>
                   </div>
                 ))}
               </div>
            </div>`;

const replacementBlock = `            <div className="space-y-3">
               <h4 className="text-[11px] uppercase font-mono text-white mb-2 font-bold tracking-widest pl-1 border-l-2 border-cyan-500">Active Membership Packages</h4>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                 {subscriptionPlans.map(plan => (
                   <div key={plan.id} className="p-4 rounded-2xl border border-white/10 bg-slate-950/40 relative overflow-hidden group text-left">
                      {plan.isFree && <div className="absolute top-0 right-0 bg-emerald-500 text-black text-[9px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-wider font-mono">Free Trial</div>}
                      
                      {editingPlanId === plan.id ? (
                        <div className="space-y-2.5 p-0.5">
                          <h5 className="text-[10px] uppercase tracking-widest text-[#00f0ff] font-mono font-bold pl-1 border-l border-cyan-500">Edit Package Details</h5>
                          <div>
                            <label className="text-[9px] font-mono text-slate-400 block uppercase font-bold">Plan Title</label>
                            <input 
                              type="text" 
                              value={editPlanTitle} 
                              onChange={e => setEditPlanTitle(e.target.value)} 
                              className="w-full text-xs bg-slate-900 border border-white/10 rounded px-2 py-1 mt-0.5 text-white focus:outline-none focus:border-cyan-400/50 font-mono" 
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-mono text-slate-400 block uppercase font-bold">Base Price ($)</label>
                              <input 
                                type="number" 
                                value={editPlanOriginalPrice} 
                                onChange={e => setEditPlanOriginalPrice(Number(e.target.value))} 
                                className="w-full text-xs bg-slate-900 border border-white/10 rounded px-2 py-1 mt-0.5 text-white focus:outline-none focus:border-cyan-400/50 font-mono" 
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-mono text-slate-400 block uppercase font-bold">Final Price ($)</label>
                              <input 
                                type="number" 
                                value={editPlanPrice} 
                                onChange={e => setEditPlanPrice(Number(e.target.value))} 
                                className="w-full text-xs bg-slate-900 border border-white/10 rounded px-2 py-1 mt-0.5 text-white focus:outline-none focus:border-cyan-400/50 font-mono" 
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-mono text-slate-400 block uppercase font-bold">Discount Tag</label>
                              <input 
                                type="text" 
                                value={editPlanDiscountTag} 
                                onChange={e => setEditPlanDiscountTag(e.target.value)} 
                                className="w-full text-xs bg-slate-900 border border-white/10 rounded px-2 py-1 mt-0.5 text-white focus:outline-none focus:border-cyan-400/50 font-mono" 
                                placeholder="90% OFF"
                              />
                            </div>
                            <div className="flex items-center pt-4">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={editPlanIsFree} 
                                  onChange={e => setEditPlanIsFree(e.target.checked)} 
                                  className="rounded border-slate-700 bg-slate-900 scale-90" 
                                />
                                <span className="text-[10px] font-mono text-slate-400 uppercase">Free/Trial</span>
                              </label>
                            </div>
                          </div>
                          <div>
                            <label className="text-[9px] font-mono text-slate-400 block uppercase font-bold">Duration Tag / Subtitle</label>
                            <input 
                              type="text" 
                              value={editPlanDuration} 
                              onChange={e => setEditPlanDuration(e.target.value)} 
                              className="w-full text-xs bg-slate-900 border border-white/10 rounded px-2 py-1 mt-0.5 text-white focus:outline-none focus:border-cyan-400/50" 
                            />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button 
                              onClick={() => {
                                setSubscriptionPlans(prev => prev.map(p => p.id === plan.id ? {
                                  ...p,
                                  title: editPlanTitle,
                                  priceUsd: editPlanPrice,
                                  originalPriceUsd: editPlanOriginalPrice,
                                  discountTag: editPlanDiscountTag,
                                  durationLabel: editPlanDuration,
                                  isFree: editPlanIsFree
                                } : p));
                                setEditingPlanId(null);
                              }}
                              className="cursor-pointer flex-1 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-[10px] font-bold uppercase hover:bg-emerald-500/30 transition text-center"
                            >
                              Save
                            </button>
                            <button 
                              onClick={() => setEditingPlanId(null)}
                              className="cursor-pointer flex-1 py-1 rounded bg-white/5 text-slate-300 border border-white/10 font-mono text-[10px] font-bold uppercase hover:bg-white/10 transition text-center"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                           <div className="flex justify-between items-start mb-2">
                              <h5 className="font-bold text-cyan-400 tracking-wide font-mono text-sm">{plan.title}</h5>
                              {plan.discountTag && (
                                 <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold font-mono px-2 py-0.5 rounded-full uppercase tracking-widest">{plan.discountTag}</span>
                              )}
                           </div>
                           
                           <div className="mb-3 flex items-baseline gap-2">
                              <span className="text-3xl font-extrabold text-white font-mono">\${plan.priceUsd}</span>
                              {plan.originalPriceUsd && plan.originalPriceUsd > plan.priceUsd && (
                                 <span className="text-xs text-rose-500 line-through font-mono font-bold decoration-rose-500 decoration-2">\${plan.originalPriceUsd}</span>
                              )}
                           </div>
                           
                           <p className="text-xs text-slate-400 leading-relaxed min-h-[40px]">{plan.durationLabel}</p>
                           
                           <div className="mt-4 flex gap-2">
                              <button 
                                 onClick={() => {
                                    setEditingPlanId(plan.id);
                                    setEditPlanTitle(plan.title);
                                    setEditPlanPrice(plan.priceUsd || 0);
                                    setEditPlanOriginalPrice(plan.originalPriceUsd || 0);
                                    setEditPlanDiscountTag(plan.discountTag || '');
                                    setEditPlanDuration(plan.durationLabel);
                                    setEditPlanIsFree(!!plan.isFree);
                                 }}
                                 className="cursor-pointer w-full bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 py-1.5 rounded font-mono text-[10px] font-bold uppercase transition flex items-center justify-center gap-1"
                              >
                                 ✏️ Edit
                              </button>
                              <button 
                                 onClick={() => {
                                    if (confirm(\`Are you sure you want to delete \${plan.title}?\`)) {
                                       setSubscriptionPlans(prev => prev.filter(p => p.id !== plan.id));
                                    }
                                 }} 
                                 className="cursor-pointer w-full bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 py-1.5 rounded font-mono text-[10px] font-bold uppercase transition flex items-center justify-center gap-1"
                              >
                                 <Trash2 className="w-3.5 h-3.5" /> Remove
                              </button>
                           </div>
                        </>
                      )}
                  </div>
                 ))}
               </div>
            </div>`;

if (!data.includes(targetBlock.trim())) {
  console.log("Direct match failed, let's use relaxed regex style...");
  // Try split & replace by mapping marker
  const marker = 'subscriptionPlans.map(plan =>';
  const mappingStartIdx = data.indexOf(marker);
  if (mappingStartIdx === -1) {
    console.error("Critical: Map marker not found!");
    process.exit(1);
  }
}

const updatedData = data.replace(targetBlock, replacementBlock);
if (updatedData === data) {
  console.log("Full block replacement directly failed. Trying localized replacement...");
  // We can do another fallback where we just find and modify
  const badBlock = `{/* Edit disabled for now, mock UI */}\n                      </div>\n                      <button onClick={() => setSubscriptionPlans(prev => prev.filter(p => p.id !== plan.id))}`;
  if (data.includes(badBlock)) {
     console.log("Found mock block! Replacing mock block...");
  }
}

fs.writeFileSync(filePath, updatedData, 'utf8');
console.log("Completed patch successfully.");
