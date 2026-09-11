import { apiRequest } from '@/services/api/client';

import type {
  CreateInquiryRequest,
  InquiryDetail,
  InquiryListResponse,
} from '../types';

export function getInquiries(accessToken: string) {
  return apiRequest<InquiryListResponse>(
    '/api/inquiries?page=1&limit=20',
    { accessToken },
  );
}

export function createInquiry(
  accessToken: string,
  input: CreateInquiryRequest,
) {
  return apiRequest<InquiryDetail>('/api/inquiries', {
    method: 'POST',
    accessToken,
    body: input,
  });
}
