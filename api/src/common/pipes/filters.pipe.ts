import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseFiltersPipe implements PipeTransform<string, [string, string | number][]> {
  transform(value: string): [string, string | number][] {
    if (!value) {
      return [];
    }

    try {
      const filters: [string, string | number][] = [];
      const searchParams = new URLSearchParams(value);

      searchParams.forEach((value, key) => {
        const match = key.match(/filters\[(.*?)\]/);
        if (match) {
          const subKey = match[1];
          
          // Validate key format (allow alphanumeric and underscores)
          if (!/^[a-zA-Z0-9_]+$/.test(subKey)) {
            throw new BadRequestException(`Invalid filter key: ${subKey}`);
          }
          
          const numValue = Number(value);
          filters.push([subKey, isNaN(numValue) ? value : numValue]);
        }
      });

      return filters;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid filters format');
    }
  }
}
