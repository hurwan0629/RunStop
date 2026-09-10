import apiClient from './client'

// 문의 목록 조회
export const getInquiries = async ({
  page = 1, // 현재 페이지 번호 
  limit = 20, // 
  status = '',
} = {}) => {
  const response = await apiClient.get('/inquiries', {
    params: {
      page,
      limit,
      ...(status && { status }),
    },
  })

  return response.data.data
}

// 문의 상세 조회
export const getInquiryDetail = async (inquiryIdx) => {
  const response = await apiClient.get(
    `/inquiries/${inquiryIdx}`,
  )

  return response.data.data
}

// 문의 상태 변경
export const updateInquiryStatus = async (
  inquiryIdx,
  status,
) => {
  const response = await apiClient.patch(
    `/inquiries/${inquiryIdx}/status`,
    { status },
  )

  return response.data.data
}

// 문의 답변 등록
export const createInquiryAnswer = async (
  inquiryIdx,
  answer,
  memo,
) => {
  const response = await apiClient.post(
    `/inquiries/${inquiryIdx}/answer`,
    {
      answer,
      ...(memo.trim() && { memo }),
    },
  )

  return response.data.data
}

export const getInquirySummary = async () => {
  const response = await apiClient.get(
    '/admin/inquiries/summary',
  )

  return response.data.data
}