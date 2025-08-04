import { horticultureTranslations } from './horticulture';
import { homeGardenTranslations } from './homegarden';
import { fieldCropTranslations } from './fieldcrop';
import { greenhouseTranslations } from './greenhouse';
import { cropTranslations } from './cropts';
import { productTranslations } from './product';
import { footnavTranslations } from './footnav';
import { homepageTranslations } from './homepage';
import { equipmentTranslations } from './equipment';
import { aiTranslations } from './ai';
export const translations = {
    en: {
        ...horticultureTranslations.en,
        ...homeGardenTranslations.en,
        ...fieldCropTranslations.en,
        ...greenhouseTranslations.en,
        ...productTranslations.en,
        ...footnavTranslations.en,
        ...homepageTranslations.en,
        ...equipmentTranslations.en,
        ...aiTranslations.en,
        ...cropTranslations.en,
    },
    th: {
        ...horticultureTranslations.th,
        ...homeGardenTranslations.th,
        ...fieldCropTranslations.th,
        ...greenhouseTranslations.th,
        ...productTranslations.th,
        ...footnavTranslations.th,
        ...homepageTranslations.th,
        ...equipmentTranslations.th,
        ...aiTranslations.th,
        ...cropTranslations.th,
    },
};
