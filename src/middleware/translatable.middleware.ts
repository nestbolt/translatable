import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { TranslatableService } from "../translatable.service";

@Injectable()
export class TranslatableMiddleware implements NestMiddleware {
  constructor(private readonly translatableService: TranslatableService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers["accept-language"];
    const locale = this.parseLocale(header);

    if (locale) {
      this.translatableService.runWithLocale(locale, () => next());
    } else {
      next();
    }
  }

  private parseLocale(header: string | undefined): string | null {
    if (!header) return null;

    const first = header.split(",")[0]?.trim();
    if (!first) return null;

    // Strip quality value: "en-US;q=0.9" → "en-US"
    const locale = first.split(";")[0]?.trim();
    if (!locale) return null;

    return locale;
  }
}
