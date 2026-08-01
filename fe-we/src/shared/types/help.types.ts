export interface HelpArticle {
  _id:         string;
  title:       string;
  content:     string;
  category:    string;
  contextTags: string[];
  isPublished: boolean;
  viewCount:   number;
  createdAt:   string;
  updatedAt:   string;
}

export interface ChatMessage {
  role:         'user' | 'model';
  content:      string;
  isStreaming?: boolean;
}

export interface CreateHelpArticleData {
  title:        string;
  content:      string;
  category:     string;
  contextTags?: string[];
  isPublished?: boolean;
}

export type UpdateHelpArticleData = Partial<CreateHelpArticleData>;

export interface ListHelpArticlesParams {
  page?:      number;
  limit?:     number;
  search?:    string;
  category?:  string;
  published?: boolean;
}

export interface PublicHelpArticlesParams {
  context?:  string;
  search?:   string;
  category?: string;
}
