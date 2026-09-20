// Owner-authored mockup content. Keep out of member/API records; document in submission.
export const mockupStories = [
 { id:'coast-diary', category:'review', label:'여행 후기', region:'통영', photoTitle:'통영 한려수도', title:'휠체어로도 충분히 즐길 수 있었던 통영 2박 3일 여행기', content:'아름다운 바다와 친절한 사람들, 모두가 반겨준 통영이었어요.', author:'바다좋아', date:'2024. 5. 18.', likes:324, comments:42, tags:['통영시','바다여행','함께여행'], featured:true },
 { id:'jinju-walk', category:'place', label:'관광지 이야기', region:'진주', photoTitle:'진주성', title:'장애인도 편하게 관람할 수 있는 진주성, 이렇게 바뀌었어요!', content:'새로 설치된 경사로와 엘리베이터 정보를 공유합니다.', author:'여행하는지니', date:'2024. 5. 12.', likes:289, comments:36, tags:['진주시','진주성','산책'], featured:true },
 { id:'geoje-parking', category:'tips', label:'여행 꿀팁', region:'거제', photoTitle:'거제 바람의 언덕', title:'거제 여행을 더 편하게! 장애인 주차장 위치 총정리', content:'주요 관광지별 장애인 주차 정보입니다. 저장해두세요!', author:'행복한동행', date:'2024. 5. 10.', likes:215, comments:28, tags:['거제시','여행준비','주차'], featured:true },
 { id:'geoje-question', category:'general', label:'여행 질문', region:'거제', photoTitle:'거제 바람의 언덕', title:'거제 바람의 언덕 휠체어 코스가 궁금해요!', content:'부모님과 함께 가려는데 휠체어로 이동이 가능한지, 경사나 화장실은 어떤지 아시는 분 계실까요?', author:'하늘바다', date:'2시간 전', likes:12, comments:5, tags:['거제시','휠체어여행','접근성'], featured:false },
 { id:'sacheon-food', category:'review', label:'여행 후기', region:'사천', photoTitle:'삼천포 해산물', title:'사천 삼천포에서 만난 인생 맛집! (휠체어 접근 가능!)', content:'경사로도 잘 되어 있고, 직원분들도 정말 친절하셨어요. 맛도 최고였습니다!', author:'맛있는여행', date:'5시간 전', likes:48, comments:9, tags:['사천시','맛집','휠체어접근성'], featured:false },
 { id:'gimhae-museum', category:'tips', label:'여행 꿀팁', region:'김해', photoTitle:'국립김해박물관', title:'김해 국립김해박물관 장애인 편의시설 후기', content:'전시 관람 동선, 엘리베이터, 장애인 화장실 등을 자세히 정리해봤어요. 아이와 함께한 여행에도 추천합니다!', author:'여행맘', date:'1일 전', likes:62, comments:14, tags:['김해시','박물관','가족여행'], featured:false },
] as const;
export type MockupStory = typeof mockupStories[number];

