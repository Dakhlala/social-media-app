export interface PostAuthor {
  _id: string;
  name: string;
  username: string;
  photo?: string;
}

export interface Post {
  _id: string;
  id?: string;
  body: string;
  image?: string;
  privacy?: string;
  user: PostAuthor;
  likes: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  bookmarked: boolean;
  createdAt: string;
  // UI helper flags
  isLikedByMe?: boolean;
}

export interface PostsResponseData {
  posts: Post[];
}

export interface SuggestionAuthor {
  _id: string;
  name: string;
  username: string;
  photo?: string;
  mutualFollowersCount: number;
  followersCount: number;
  isFollowing?: boolean;
}

export interface SuggestionsResponseData {
  suggestions: SuggestionAuthor[];
}

export interface CommentCreator {
  _id: string;
  name: string;
  username: string;
  photo?: string;
}

export interface PostComment {
  _id: string;
  content: string;
  commentCreator: CommentCreator;
  post: string;
  parentComment?: string | null;
  likes?: string[];
  likesCount?: number;
  createdAt: string;
  image?: string;
  repliesCount?: number;
  isLikedByMe?: boolean;
}

export interface CommentsResponseData {
  comments: PostComment[];
}

