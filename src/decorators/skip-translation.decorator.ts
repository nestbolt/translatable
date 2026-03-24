import { SetMetadata } from "@nestjs/common";
import { SKIP_TRANSLATION_KEY } from "../translatable.constants";

export const SkipTranslation = () => SetMetadata(SKIP_TRANSLATION_KEY, true);
