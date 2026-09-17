export type InquiryStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'ANSWERED';

export interface InquiryListItem {
  idx: number;
  title: string;
  status: InquiryStatus;
  createdAt: string;
}

export interface InquiryListResponse {
  items: InquiryListItem[];
  page: number;
  limit: number;
}

export interface CreateInquiryRequest {
  title: string;
  content: string;
}

export interface InquiryDetail extends InquiryListItem {
  content: string;
  answer: string | null;
  answeredAt: string | null;
}
