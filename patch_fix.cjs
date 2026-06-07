const fs = require('fs');

const appFile = 'src/App.tsx';
let content = fs.readFileSync(appFile, 'utf8');

const regexToReplace = /aboutEnglishStory: 'SPT OFFICIAL originates from a deep conceptual design process designed to merge cutting-edge micro-systems,\n.*?\n.*?\n.*?\n.*?natural brand aesthetics\.',/s;

const correctStr = `aboutEnglishStory: 'SPT OFFICIAL originates from a deep conceptual design process designed to merge cutting-edge micro-systems, high-end visual art, and sound styling. It represents a galactic interface built for premium multi-media execution. Synthesizing solutions that bridge digital excellence and natural brand aesthetics.',
      brandGenesisStory: 'Sadeep Pasindu වන මා විසින් ආරම්භ කරන ලද "Sadeep Pasindu Creative Universe" (SPT OFFICIAL) යනු හුදෙක් සේවා සපයන ආයතනයක් පමණක් නොවේ. එය තාක්ෂණයේ සහ කලාවේ සංකලනයෙන් බිහිවූ සුවිශේෂී ඩිජිටල් තෝතැන්නකි. අප විසින් සපයනු ලබන සෑම සේවාවක් පිටුපසම ඇති විශිෂ්ටතම නිර්මාණශීලිත්වය සහ විශ්වසනීයත්වය ඔබගේ සන්නාමයේ වර්ධනයට මහෝපකාරී වනු නොඅනුමානය.',
      brandGenesisStoryEn: 'The "Sadeep Pasindu Creative Universe" (SPT OFFICIAL) founded by me is not just a service providing agency. It is a unique digital haven born from the fusion of technology and art. We guarantee that the supreme creativity and reliability behind every service we provide will be a great support for the growth of your brand.',
      blogSubtitle: 'SPT OFFICIAL වෙතින් පිරිනමන දිනපතා අලුත්ම තාක්ෂණික තොරතුරු, නිවේදන, සහ විශේෂ ලිපි පෙළ මෙතැනින් කියවන්න.',
      blogSubtitleEn: 'Read the latest technical information, announcements, and special articles offered daily by SPT OFFICIAL here.',`;

content = content.replace(regexToReplace, correctStr);

fs.writeFileSync(appFile, content);
console.log('App initialization fixed!');
