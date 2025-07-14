import { Controller } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  // TODO: Add search endpoints
  // - searchUsers
  // - searchMoments
  // - searchHashtags
  // - searchAll
}
