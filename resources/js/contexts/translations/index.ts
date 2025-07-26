import { horticultureTranslations } from './horticulture';
import { homeGardenTranslations } from './homegarden';

export const translations = {
    en: {
        ...horticultureTranslations.en,
        ...homeGardenTranslations.en,
    },
    th: {
        ...horticultureTranslations.th,
        ...homeGardenTranslations.th,
    },
};