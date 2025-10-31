import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const vertialFiles = [
  'https://pbs.twimg.com/media/G2Qcoh3WIAAzwD6?format=jpg&name=large',
  'https://pbs.twimg.com/media/G2o8WN2XAAAr8D2?format=jpg&name=medium',
  'https://pbs.twimg.com/media/G2-kHCtbwAE1l9W?format=jpg&name=large',
  'https://pbs.twimg.com/media/G2_EoUfXAAA6jiS?format=jpg&name=4096x4096',
  'https://pbs.twimg.com/media/G2qu9EWXcAI3h6L?format=jpg&name=large',
  'https://pbs.twimg.com/media/G2qBQegW4AAnMHE?format=jpg&name=medium',
  'https://pbs.twimg.com/media/G2qIwM8XoAAvSYd?format=jpg&name=large',
  'https://pbs.twimg.com/media/G26TwQlXsAELa1s?format=jpg&name=large',
  'https://pbs.twimg.com/media/G2ujwC8bIAAauyp?format=jpg&name=4096x4096',
  'https://pbs.twimg.com/media/G2ajBpgXAAEqXxi?format=jpg&name=large',
  'https://pbs.twimg.com/media/G3BL6oJbwAUB4Ui?format=jpg&name=4096x4096',
  'https://pbs.twimg.com/media/GYWooZnWsAAbkp5?format=png&name=4096x4096',
  'https://pbs.twimg.com/media/G1kGqJ-aoAUUCg0?format=jpg&name=large',
  'https://pbs.twimg.com/media/FvVURqPaEAA5FNK?format=jpg&name=medium',
  'https://pbs.twimg.com/media/G3PhrgYW0AAvaOl?format=jpg&name=4096x4096',
  'https://pbs.twimg.com/media/GIvg32tW0AAxAC7?format=jpg&name=medium',
  'https://pbs.twimg.com/media/GzDhn68asAA_iNJ?format=jpg&name=900x900',
  'https://pbs.twimg.com/media/GzB86q_bgAAa-GX?format=jpg&name=900x900',
  'https://pbs.twimg.com/media/Ft4nWbsakAA9_x7?format=jpg&name=large',
  'https://pbs.twimg.com/media/Ft4nY4AaEAEfcjc?format=jpg&name=large',
  'https://pbs.twimg.com/media/GvbCXMRX0AAFFmF?format=jpg&name=large',
  'https://pbs.twimg.com/media/GwQZcyxakAAJwOq?format=jpg&name=large',
  'https://pbs.twimg.com/media/Gro0xPlW0AAJLBd?format=jpg&name=large',
  'https://pbs.twimg.com/media/G2KD7TpaIAUhYar?format=jpg&name=medium',
  'https://pbs.twimg.com/media/G2_Dhi-WEAAx6nc?format=jpg&name=large',
  'https://pbs.twimg.com/media/G3sQycBXgAA81Cc?format=jpg&name=4096x4096',
  'https://pbs.twimg.com/media/G3DkcRXbAAAVAC_?format=jpg&name=4096x4096',
  'https://pbs.twimg.com/media/G3hksbXWkAA2VOG?format=jpg&name=large',
  'https://pbs.twimg.com/media/G3r9OHgWEAA5Cv0?format=jpg&name=medium',
  'https://pbs.twimg.com/media/G3pH2iYXgAAwKX4?format=jpg&name=medium',
  'https://pbs.twimg.com/media/G23BUhQW8AAKxPq?format=jpg&name=medium',
  'https://pbs.twimg.com/media/G3iVOm8WQAAq1QJ?format=jpg&name=medium',
  'https://pbs.twimg.com/media/G3js6pdXEAAXZWq?format=jpg&name=medium',
  'https://pbs.twimg.com/media/G3Sr7r2WkAAOAiq?format=jpg&name=large',
  'https://pbs.twimg.com/media/G3f0PqAXYAAhffN?format=jpg&name=large',
  'https://pbs.twimg.com/media/G3YqhSeW0AAJDA5?format=jpg&name=large',
  'https://pbs.twimg.com/media/G3EfPw6XsAA6A9z?format=jpg&name=small',
  'https://pbs.twimg.com/media/G35HP9PXgAAFSHo?format=jpg&name=large',
  'https://pbs.twimg.com/media/G35HQN2WQAAmeSj?format=jpg&name=large',
];

const squareFiles = [
  'https://pbs.twimg.com/media/G3EAySMXAAA4BS9?format=jpg&name=900x900',
  'https://pbs.twimg.com/media/G1mvt21WAAAp9AP?format=jpg&name=large',
  'https://pbs.twimg.com/media/G3DAyALXoAAVAbG?format=jpg&name=900x900',
];

const horizontalFiles = [
  'https://pbs.twimg.com/media/G2_ZJbCWIAAWq8S?format=jpg&name=large',
  'https://pbs.twimg.com/media/GwHnupxWgAAODIB?format=jpg&name=4096x4096',
  'https://pbs.twimg.com/media/G3OGs0uWAAAhtzi?format=jpg&name=large',
  'https://pbs.twimg.com/media/G3TznHkWkAAa3j2?format=jpg&name=medium',
  'https://pbs.twimg.com/media/G2i-o16WsAAHkol?format=jpg&name=small',
  'https://pbs.twimg.com/media/G3TO5OiacAA3IMq?format=jpg&name=large',
  'https://pbs.twimg.com/media/G3TO5OnbkAARjVi?format=jpg&name=large',
  'https://pbs.twimg.com/media/G3TO5OibMAAYNOy?format=jpg&name=large',
  'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fmigrationology.smugmug.com%2FBest-Vietnamese-Food%2Fi-2NtpfQS%2F0%2FX3%2Fbest-vietnamese-food-20-X3.jpg&f=1&nofb=1&ipt=a1544b922d5a36284179fdf11e2667a02d451c12da12dd7c2ec6efc8c866cde9',
  'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fdeih43ym53wif.cloudfront.net%2Fbun-cha-vietnam-food-shutterstock_769738648_a1baaf2235.jpeg&f=1&nofb=1&ipt=cc97e91629971ef92528e62e7e47abeebefbe2056703067994584c52521fc4ff',
  'https://pbs.twimg.com/media/GoBiucxXkAAHi3l?format=png&name=4096x4096',
  'https://pbs.twimg.com/media/GoBizCBW8AAxBio?format=png&name=large',
  'https://pbs.twimg.com/media/GoBlnt_XwAAsNE0?format=png&name=large',
  'https://pbs.twimg.com/media/G2-iEGNXUAAuQ2s?format=jpg&name=large',
  'https://pbs.twimg.com/media/Fmx622sXEA4veyG?format=jpg&name=4096x4096',
  'https://pbs.twimg.com/media/Fmx622pWIAAKJ23?format=jpg&name=4096x4096',
  'https://pbs.twimg.com/media/Fmx622oXEAwuCFT?format=jpg&name=4096x4096',
  'https://pbs.twimg.com/media/G3AgH5HbwAEzIxc?format=png&name=large',
  'https://pbs.twimg.com/media/G3nhwlPWgAA2Ag7?format=jpg&name=4096x4096',
];

const file = [...vertialFiles, ...squareFiles, ...horizontalFiles];

function getRandomFile(seed: string) {
  return file[
    Math.floor(seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % file.length)
  ];
}

function getAspectRatioFromImageUrl(imageUrl: string): 'square' | 'portrait' | 'landscape' {
  const imageIndex = file.indexOf(imageUrl);

  // Based on the file array structure:
  // - vertical images: indices 0-27 (lines 6-33)
  // - square image: index 28 (line 36)
  // - horizontal images: indices 29-47 (lines 39-57)

  if (imageIndex < vertialFiles.length) return 'portrait';
  else if (imageIndex < vertialFiles.length + squareFiles.length) return 'square';
  else if (imageIndex < vertialFiles.length + squareFiles.length + horizontalFiles.length)
    return 'landscape';

  return 'portrait';
}

@Injectable()
export class UrlPlaceholderInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const cookieValue = request?.cookies?.['__secret'];
    const expectedValue = process.env.WHO_I_AM;
    const hasSecret = cookieValue === expectedValue;

    if (hasSecret) return next.handle();
    return next.handle().pipe(map((data) => this.replaceUrlsDeep(data, new Set(), true)));
  }

  private replaceUrlsDeep<T>(value: T, usedFiles: Set<string>, isTopLevel = false): T {
    if (value == null) return value;

    if (typeof value === 'string') {
      return this.replaceUrlsInString(value, usedFiles) as unknown as T;
    }

    if (Array.isArray(value)) {
      // Only create new Sets for top-level array items (e.g., posts in a feed)
      // Nested arrays (e.g., files within a post) should share the same Set
      if (isTopLevel) {
        return (value as unknown as any[]).map((item) =>
          this.replaceUrlsDeep(item, new Set(), false)
        ) as unknown as T;
      } else {
        return (value as unknown as any[]).map((item) =>
          this.replaceUrlsDeep(item, usedFiles, false)
        ) as unknown as T;
      }
    }

    if (typeof value === 'object') {
      const result: Record<string, unknown> = {};
      let usedImageUrl: string | null = null;

      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (typeof v === 'string' && v.startsWith('https://')) {
          // This might be an image URL that was replaced
          const replacedUrl = this.replaceUrlsInString(v, usedFiles);
          if (replacedUrl !== v) {
            usedImageUrl = replacedUrl;
          }
          result[k] = replacedUrl;
        } else {
          // Check if this key contains the top-level collection (e.g., "items")
          const isTopLevelCollection = isTopLevel && (k === 'items' || k === 'data');
          result[k] = this.replaceUrlsDeep(v, usedFiles, isTopLevelCollection);
        }
      }

      // If this object has an aspectRatio field and we used an image, update it
      if (usedImageUrl && 'aspectRatio' in result) {
        result.aspectRatio = getAspectRatioFromImageUrl(usedImageUrl);
      }

      return result as unknown as T;
    }

    return value;
  }

  private replaceUrlsInString(text: string, usedFiles: Set<string>): string {
    // Replace any https:// or http:// URL with the placeholder prefixed by '@'
    const urlRegex = /https?:\/\/[^\s"'<>)+]+/g;
    return text.replace(urlRegex, (url) => {
      // Skip replacing audio/video URLs
      if (url.endsWith('.mp3') || url.endsWith('.mp4')) {
        return url;
      }

      let selectedFile: string;

      // First try the seeded random approach
      selectedFile = getRandomFile(url);

      // If that file is already used, find the first available unused file
      if (usedFiles.has(selectedFile)) {
        let found = false;

        // Try with different seeds first
        for (let i = 1; i < file.length; i++) {
          selectedFile = getRandomFile(`${url}-${i}`);
          if (!usedFiles.has(selectedFile)) {
            found = true;
            break;
          }
        }

        // If still not found, just pick the first unused file from the array
        if (!found) {
          for (const f of file) {
            if (!usedFiles.has(f)) {
              selectedFile = f;
              found = true;
              break;
            }
          }
        }

        // If we've exhausted all files (very unlikely), just reuse one
        if (!found) {
          selectedFile = file[0];
        }
      }

      // Mark this file as used
      usedFiles.add(selectedFile);

      return selectedFile;
    });
  }
}
