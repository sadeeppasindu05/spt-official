const fs = require('fs');

const appFile = 'src/App.tsx';
let content = fs.readFileSync(appFile, 'utf8');

const target1 = `Sadeep Pasindu වන මා විසින් ආරම්භ කරන ලද "Sadeep Pasindu Creative Universe" (SPT OFFICIAL) යනු හුදෙක් සේවා සපයන ආයතනයක් පමණක් නොවේ. එය තාක්ෂණයේ සහ කලාවේ සංකලනයෙන් බිහිවූ සුවිශේෂී ඩිජිටල් තෝතැන්නකි. අප විසින් සපයනු ලබන සෑම සේවාවක් පිටුපසම ඇති විශිෂ්ටතම නිර්මාණශීලිත්වය සහ විශ්වසනීයත්වය ඔබගේ සන්නාමයේ වර්ධනයට මහෝපකාරී වනු නොඅනුමානය.`;
const repl1 = `{t(config.brandGenesisStory || '${target1}', config.brandGenesisStoryEn || '')}`;

content = content.replace(target1, repl1);

const target2 = `SPT OFFICIAL වෙතින් පිරිනමන දිනපතා අලුත්ම තාක්ෂණික තොරතුරු, නිවේදන, සහ විශේෂ ලිපි පෙළ මෙතැනින් කියවන්න.`;
const repl2 = `{t(config.blogSubtitle || '${target2}', config.blogSubtitleEn || '')}`;

// It might be in the file multiple times. Let's do a global replace for the exact text but NOT in the config init!
// The config init has `blogSubtitle: '...'` and `brandGenesisStory: '...'`.
// The match will be where it is NOT preceded by `'`.

content = content.replace(new RegExp(`>\\s*${target1}\\s*<`), `>{${repl1}}<`);
content = content.replace(new RegExp(`>\\s*${target2}\\s*<`), `>{${repl2}}<`);

// If that doesn't hit, let's just do it manually.
fs.writeFileSync(appFile, content);
console.log('App layout patched');
