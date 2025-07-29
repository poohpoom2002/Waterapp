import { horticultureTranslations } from './horticulture';
import { homeGardenTranslations } from './homegarden';
import { fieldCropTranslations } from './fieldcrop';
import { greenhouseTranslations } from './greenhouse';

export const translations = {
    en: {
        ...horticultureTranslations.en,
        ...homeGardenTranslations.en,
        ...fieldCropTranslations.en,
        ...greenhouseTranslations.en
    },
    th: {
        ...horticultureTranslations.th,
        ...homeGardenTranslations.th,
        ...fieldCropTranslations.th,
        ...greenhouseTranslations.th
    },
};
