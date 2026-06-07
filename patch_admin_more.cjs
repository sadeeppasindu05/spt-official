const fs = require('fs');

const adminFile = 'src/components/AdminConsole.tsx';
let content = fs.readFileSync(adminFile, 'utf8');

const hookTarget = `const [storyEnglishInput, setStoryEnglishInput] = useState(config.aboutEnglishStory || '');`;
const hookReplacement = `${hookTarget}
  const [brandGenesisStoryInput, setBrandGenesisStoryInput] = useState(config.brandGenesisStory || '');
  const [brandGenesisStoryEnInput, setBrandGenesisStoryEnInput] = useState(config.brandGenesisStoryEn || '');
  const [blogSubtitleInput, setBlogSubtitleInput] = useState(config.blogSubtitle || '');
  const [blogSubtitleEnInput, setBlogSubtitleEnInput] = useState(config.blogSubtitleEn || '');`;
  
content = content.replace(hookTarget, hookReplacement);

const saveTarget = `aboutEnglishStory: storyEnglishInput,`;
const saveReplacement = `${saveTarget}
      brandGenesisStory: brandGenesisStoryInput,
      brandGenesisStoryEn: brandGenesisStoryEnInput,
      blogSubtitle: blogSubtitleInput,
      blogSubtitleEn: blogSubtitleEnInput,`;

content = content.replace(saveTarget, saveReplacement);

const uiTarget = `<div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">English Bio/Story (About Us section)</label>
                  <textarea
                    rows={3}
                    value={storyEnglishInput}
                    onChange={e => setStoryEnglishInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none"
                    placeholder="SPT OFFICIAL originates from a deep conceptual design process..."
                  />
                </div>`;

const uiReplacement = `${uiTarget}

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Brand Genesis Story (Sinhala)</label>
                  <textarea
                    rows={3}
                    value={brandGenesisStoryInput}
                    onChange={e => setBrandGenesisStoryInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none"
                    placeholder="Sadeep Pasindu වන මා විසින් ආරම්භ කරන ලද..."
                  />
                  <textarea
                    rows={3}
                    value={brandGenesisStoryEnInput}
                    onChange={e => setBrandGenesisStoryEnInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-cyan-400/50 mt-2 text-white focus:outline-none"
                    placeholder="[English] The Sadeep Pasindu Creative Universe..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Blog Subtitle (Sinhala)</label>
                  <textarea
                    rows={2}
                    value={blogSubtitleInput}
                    onChange={e => setBlogSubtitleInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none"
                    placeholder="SPT OFFICIAL වෙතින් පිරිනමන දිනපතා අලුත්ම..."
                  />
                  <textarea
                    rows={2}
                    value={blogSubtitleEnInput}
                    onChange={e => setBlogSubtitleEnInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-cyan-400/50 mt-2 text-white focus:outline-none"
                    placeholder="[English] Read the latest technical information..."
                  />
                </div>`;

content = content.replace(uiTarget, uiReplacement);

fs.writeFileSync(adminFile, content);
console.log('Admin patched for extra text inputs!');
