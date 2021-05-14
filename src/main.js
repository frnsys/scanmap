import setupApp from './app';
import {updateLabels} from './labels';
import setupCams from './extras/cams';
import setupPrecincts from './extras/precincts';
import setupHelicopters from './extras/helis';
import {loadLanguage, translate} from './i18n';

loadLanguage(() => {
  setupApp((map) => {
    setupCams(map);
    setupPrecincts(map);
    setupHelicopters(map);
  });

  updateLabels();
  translate();
});
