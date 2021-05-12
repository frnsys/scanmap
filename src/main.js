import setupApp from './app';
import setupCams from './extras/cams';
import setupPrecincts from './extras/precincts';
import setupHelicopters from './extras/helis';
import {loadLanguage} from './i18n';

loadLanguage(() => {
  setupApp((map) => {
    setupCams(map);
    setupPrecincts(map);
    setupHelicopters(map);
  });
});
