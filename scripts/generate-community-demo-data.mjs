import { mkdir, writeFile } from "node:fs/promises";

const BATCH = Object.freeze({ id: "wave-community-demo-2026-v1", ownerKey: "wave-community-demo-fixtures", label: "합성 데모 예시" });
const regions = [
  ["창원", "changwon"], ["진주", "jinju"], ["통영", "tongyeong"], ["사천", "sacheon"], ["김해", "gimhae"], ["밀양", "miryang"],
  ["거제", "geoje"], ["양산", "yangsan"], ["의령", "uiryeong"], ["함안", "haman"], ["창녕", "changnyeong"], ["고성", "goseong"],
  ["남해", "namhae"], ["하동", "hadong"], ["산청", "sancheong"], ["함양", "hamyang"], ["거창", "geochang"], ["합천", "hapcheon"],
].map(([name, slug]) => ({ name, slug }));
const details = [
  ["보조 배터리", "견과", "웃는 표정", "파란 메모장"], ["얇은 겉옷", "과일 젤리", "손을 흔든 순간", "종이 메모"], ["짧은 충전선", "크래커", "창가의 옆모습", "휴대폰 목록"],
  ["작은 물병", "초콜릿", "나란히 놓인 신발", "주머니 수첩"], ["여분 양말", "곡물바", "서로 찍어 준 뒷모습", "공유 메모"], ["접이식 장바구니", "새콤한 사탕", "쉬며 웃던 얼굴", "손글씨 한 줄"],
  ["휴대용 티슈", "작은 샌드위치", "가방을 정리하던 순간", "스티커 메모"], ["안경 닦이", "쌀과자", "서로 다른 포즈", "달력의 빈칸"], ["머리끈", "부드러운 빵", "대화하다 웃은 장면", "연필 목록"],
  ["작은 파우치", "말린 과일", "나란히 앉은 모습", "가족 단체방 메모"], ["손수건", "한입 약과", "잠깐 멈춘 장면", "여행 제목 한 줄"], ["귀마개", "비스킷", "가방 위에 모인 손", "세 줄 일기"],
  ["작은 우산", "포장 캔디", "고개를 돌린 순간", "사진 아래 문장"], ["립밤", "고구마 말랭이", "같은 곳을 바라본 모습", "동행과 나눈 한마디"], ["휴대용 방석", "에너지바", "쉬는 동안 찍은 손", "오늘의 기분 한 단어"],
  ["여분 마스크", "작은 쿠키", "짐을 나눠 든 모습", "아침에 고친 계획표"], ["볼펜", "프레첼", "서로 기다려 주던 순간", "표시만 한 지도"], ["가벼운 에코백", "한입 떡", "돌아가기 전 표정", "다음에 하고 싶은 일"],
].map(([item, snack, photo, note]) => ({ item, snack, photo, note }));
const withAnd = (value) => {
  const code = value.codePointAt(value.length - 1) - 0xac00;
  return `${value}${code >= 0 && code <= 11171 && code % 28 ? "과" : "와"}`;
};
const withObject = (value) => {
  const code = value.codePointAt(value.length - 1) - 0xac00;
  return `${value}${code >= 0 && code <= 11171 && code % 28 ? "을" : "를"}`;
};
const withSubject = (value) => {
  const code = value.codePointAt(value.length - 1) - 0xac00;
  return `${value}${code >= 0 && code <= 11171 && code % 28 ? "이" : "가"}`;
};
const withTopic = (value) => {
  const code = value.codePointAt(value.length - 1) - 0xac00;
  return `${value}${code >= 0 && code <= 11171 && code % 28 ? "은" : "는"}`;
};

const scenarios = [
  { category: "tips", title: "충전기를 두고 온 여행기", body: (r,d,i) => [`${r.name}으로 떠난 날 충전선을 책상에 두고 온 걸 뒤늦게 알아챘어요.`, `사진을 아껴 찍느라 ${withObject(d.photo)} 놓친 게 조금 아쉬웠습니다.`, ...(i%3===0?[`다음 가방에는 ${withAnd(d.item)} 충전선을 한 파우치에 넣어 두려고요.`]:[]), "다들 출발 전에 꼭 확인하는 물건이 있나요?"], replies: [(r,d)=>`저는 현관문에 충전선 메모를 붙여 둬요. ${d.note}에도 적으면 덜 잊을 것 같아요.`,(r,d)=>`${d.item}처럼 자주 쓰는 물건과 충전선을 같은 파우치에 넣는 방법도 괜찮아 보여요.`] },
  { category: "review", title: "부모님과 일정 속도를 맞춘 이야기", body: (r,d,i) => [`부모님과 ${withObject(r.name)} 둘러보는데 제가 적어 둔 순서가 생각보다 빽빽했어요.`, "한 곳을 빼고 앉아서 이야기하는 시간을 늘리니 분위기가 훨씬 편해졌습니다.", ...(i%2?["다음에는 하고 싶은 것보다 쉬고 싶은 때를 먼저 물어보려고 해요."]:[]), "가족 여행에서는 누가 일정 속도를 정하나요?"], replies: [(r)=>`저희 집이라면 아침에 모두에게 꼭 하고 싶은 것 하나씩만 물어볼 것 같아요. ${r.name} 일정도 그 답을 듣고 줄이면 덜 서운하겠네요.`,()=>"부모님이 먼저 쉬자고 말하기 어려울 수 있어서 제가 중간중간 묻는 쪽이 마음 편할 것 같아요."] },
  { category: "place", title: "역광 사진만 남은 날", body: (r,d,i) => [`${r.name}에서 사진을 잔뜩 찍었는데 얼굴이 어둡게 나온 장면만 남았어요.`, `${withSubject(d.photo)} 흔들렸어도 분위기가 좋아서 결국 지우지 못했습니다.`, ...(i%4===0?["완벽한 사진보다 그때 웃었던 기억이 더 오래갈 것 같아요."]:[]), "여러분은 흔들린 사진도 남겨 두나요?"], replies: [()=>"표정이 마음에 들면 조금 어두워도 남겨 두는 편이에요. 나중에는 화질보다 그날 대화가 먼저 떠오르더라고요.",(r,d)=>`${r.name} 앨범을 만든다면 ${d.photo} 한 장을 첫 화면에 두고 싶어요.`] },
  { category: "general", title: "하루와 이틀 사이에서 고민 중", body: (r,d,i) => [`${r.name} 여행을 하루로 다녀올지 잠을 자고 이틀로 나눌지 고민 중입니다.`, i%2===0?"짐 싸는 수고는 줄이고 싶지만 서두르는 일정도 피하고 싶어요.":"동행은 짧고 굵게, 저는 느긋하게 머물고 싶은 쪽이에요.", "여러분이라면 일정의 길이를 무엇으로 결정할까요?"], replies: [()=>"저는 장소 수보다 다음 날 피로를 먼저 생각할 것 같아요. 하루 일정이라면 하고 싶은 걸 과감히 줄이겠습니다.",(r)=>`${r.name}에서 무엇을 몇 개 보느냐보다 동행이 어느 속도를 편해하는지 먼저 맞춰 보면 좋겠어요.`] },
  { category: "review", title: "짐을 너무 많이 챙긴 뒤의 메모", body: (r,d,i) => [`${r.name} 여행에서 혹시 몰라 챙긴 물건 때문에 가방만 무거워졌어요.`, `${withTopic(d.item)} 잘 썼지만 여분 옷과 큰 파우치는 한 번도 꺼내지 않았습니다.`, ...(i%3?["다음에는 ‘없으면 정말 곤란한가’부터 생각해 보려고요."]:[]), "짐을 줄일 때 가장 먼저 빼는 것은 무엇인가요?"], replies: [(r,d)=>`저는 ${d.item}처럼 바로 쓰는 물건만 바깥 주머니에 두고 나머지는 절반으로 줄여 볼래요. ${r.name} 하루 짐이라면 작은 가방도 괜찮겠네요.`,()=>"입을 옷을 상황별로 여러 벌 챙기면 늘 후회하더라고요. 안 쓴 물건을 메모해 두면 다음에 도움이 될 것 같아요."] },
  { category: "travel-talk", title: "간식 취향이 갈린 동행들", body: (r,d,i) => [`친구들과 ${r.name}으로 떠날 계획을 세우며 간식부터 의견이 갈렸어요.`, `저는 ${withObject(d.snack)} 챙기고 싶었는데 한 친구는 달콤한 것만 찾더라고요.`, ...(i%2===0?["결국 각자 하나씩 고르고 조금씩 나누자는 결론을 냈습니다."]:[]), "여행 가방에 꼭 넣는 간식이 궁금해요."], replies: [(r,d)=>`${d.snack}처럼 손에 묻지 않는 간식이 저는 편해요. ${r.name} 이야기하면서 나눠 먹으면 종류도 다양하겠네요.`,()=>"저는 단맛과 짠맛을 하나씩 챙겨요. 취향이 다르면 각자 담당을 정하는 것도 재미있을 것 같아요."] },
  { category: "tips", title: "공유 앨범을 정리하는 방식", body: (r,d,i) => [`${r.name} 여행이 끝난 뒤 단체 사진방에 비슷한 사진이 너무 많이 올라왔어요.`, `${d.photo}처럼 모두가 좋아한 사진만 먼저 골라 작은 앨범을 만들고 싶습니다.`, ...(i%4===1?["누가 삭제할지 정하면 괜히 눈치가 보여 별표만 모으는 중이에요."]:[]), "여럿이 찍은 사진은 어떻게 정리하나요?"], replies: [()=>"삭제부터 하지 말고 각자 좋아하는 사진에 표시한 뒤 공통으로 고른 것만 모으면 덜 부담스러워요.",(r,d)=>`${r.name} 앨범 제목을 먼저 정하고 ${withObject(d.photo)} 표지 후보로 올리면 대화가 자연스럽게 시작될 것 같아요.`] },
  { category: "together", title: "일정 속도로 살짝 다퉜던 날", body: (r,d,i) => [`${r.name}에서 저는 천천히 보고 싶고 친구는 다음 순서로 빨리 가고 싶어 했어요.`, "말없이 따라가다가 서로 표정이 굳어 잠깐 멈춰 이야기했습니다.", ...(i%3===2?["‘지금 더 보고 싶은 사람?’이라고 묻는 것만으로도 달라졌을 것 같아요."]:[]), "속도가 다를 때 어떤 말로 조율하면 덜 어색할까요?"], replies: [()=>"저라면 ‘나는 십 분만 더 보고 싶어’처럼 시간을 구체적으로 말할래요. 상대를 재촉하기보다 내 상태를 설명하는 편이 낫더라고요.",(r)=>`${r.name} 계획을 짤 때부터 빠르게 보는 구간과 오래 머무는 구간을 한 번씩 고르면 서로 예상하기 쉬울 것 같아요.`] },
  { category: "general", title: "유모차 여행 가방에 뭘 넣을까요", body: (r,d,i) => [`아이와 ${r.name}으로 떠날 때 유모차 가방을 얼마나 간단히 꾸릴지 묻는 글입니다.`, `${d.item}, 여벌 옷, 간식까지 적었더니 벌써 목록이 길어졌어요.`, ...(i%2?["실제 장소의 이동 가능 여부나 시설 상태를 확인했다는 내용은 아닙니다."]:[]), "부피를 줄이면서도 빠뜨리지 않는 짐 정리법이 있나요?"], replies: [(r,d)=>`저라면 ${d.item}처럼 바로 꺼낼 물건과 나중에 쓸 물건을 주머니 두 개로 나눌 것 같아요. ${r.name} 시설에 관한 답은 아니고 가방 정리 의견입니다.`,()=>"목록을 ‘꼭 필요’와 ‘있으면 편함’으로 나눈 뒤 두 번째 묶음부터 줄여 보면 어떨까요?"] },
  { category: "place", title: "기념품을 하나만 고른다면", body: (r,d,i) => [`${r.name} 여행에서 기념품을 여러 개 고르다 결국 작은 것 하나만 남겼어요.`, `물건보다 ${withSubject(d.note)} 더 오래 기억에 남을 것 같았거든요.`, ...(i%3===1?["선물용과 제 것을 동시에 고르려니 오히려 결정이 어려웠습니다."]:[]), "여행 뒤에도 자주 보는 기념품은 어떤 종류인가요?"], replies: [()=>"저는 짧은 문장이 적힌 엽서처럼 가벼운 것을 좋아해요. 책상에서 자주 보게 되더라고요.",(r,d)=>`${withObject(r.name)} 떠올릴 ${d.note}만 있어도 충분하다는 선택이 이해돼요. 선물은 받는 사람 취향부터 물어보고 싶네요.`] },
  { category: "review", title: "신발 선택을 잘못한 날", body: (r,d,i) => [`${r.name}에서 새 신발을 신고 하루를 보냈다가 발이 신경 쓰여 사진보다 신발 생각을 더 했어요.`, i%2?"예뻐 보이는 것만 생각하고 익숙한 신발을 두고 온 게 아쉬웠어요.":"다음에는 오래 신어 본 가벼운 신발을 고르려고 합니다.", `가방 속 ${d.item}보다 신발 선택이 더 중요하게 느껴진 하루였어요.`], replies: [()=>"저도 여행 전날 새 신발을 꺼내면 망설여져요. 오래 신어 본 신발이 마음도 편한 것 같습니다.",(r)=>`${r.name} 일정과 무관하게 발이 불편하면 하루 종일 신경 쓰일 것 같아요. 여분보다 익숙함을 고르겠습니다.`] },
  { category: "together", title: "아침형과 늦잠형이 함께 떠날 때", body: (r,d,i) => [`${r.name} 여행을 준비하는데 저는 일찍 움직이고 싶고 동행은 느긋하게 시작하고 싶어 해요.`, ...(i%3===0?["각자 아침 시간을 보내고 점심 무렵 만나는 방법도 이야기 중입니다."]:[]), "처음부터 한 시각에 맞출지 따로 시작할지 고민돼요."], replies: [()=>"억지로 같은 시각에 시작하면 둘 다 피곤할 수 있어서 저는 따로 아침을 보내는 쪽에 한 표예요.",(r,d)=>`${r.name}에서 만난 뒤 함께 하고 싶은 한 가지와 ${d.snack} 먹는 시간만 맞춰도 충분히 같이 여행한 느낌이 날 것 같아요.`] },
  { category: "together", title: "식사 시간이 다른 친구와의 계획", body: (r,d,i) => [`친구는 배고프기 전에 먹고 저는 조금 늦게 먹는 편이라 ${r.name} 일정에서 식사 시점을 두고 고민했어요.`, `결국 ${withObject(d.snack)} 중간에 나눠 먹고 둘 다 배고프기 전에 이야기하기로 했습니다.`, ...(i%4===2?["참다가 갑자기 예민해지는 것보다 미리 말하는 편이 낫겠죠."]:[]), "동행과 식사 리듬이 다르면 어떻게 맞추나요?"], replies: [(r,d)=>`${d.snack}처럼 작은 간식을 각자 챙기면 ${r.name} 일정 중에도 식사 시각을 조금 유연하게 정할 수 있을 것 같아요.`,()=>"배고픈 정도를 숫자로 말해 보자는 생각도 재밌네요. ‘지금 7 정도’라고 하면 눈치게임이 줄 것 같아요."] },
  { category: "general", title: "작은 가방을 따로 챙길지 고민", body: (r,d,i) => [`${r.name}으로 떠날 때 큰 가방 하나만 들지, ${withObject(d.item)} 넣을 작은 가방을 따로 챙길지 고민 중이에요.`, i%2===0?"손이 자유로운 건 좋지만 가방이 두 개면 자꾸 확인하게 되더라고요.":"물건을 바로 꺼내고 싶은 마음과 짐을 단순하게 하고 싶은 마음이 반반입니다.", "여러분은 한 가방파인가요, 작은 가방을 나누는 편인가요?"], replies: [()=>"저는 지갑과 휴대폰만 작은 가방에 두고 나머지는 큰 가방에 넣어요. 두 가방의 역할이 분명하면 덜 헷갈립니다.",(r,d)=>`${r.name} 계획에서도 ${withObject(d.item)} 자주 꺼낼 것 같다면 작은 가방이 편하겠지만, 자주 안 쓰면 하나로 합칠래요.`] },
  { category: "tips", title: "세 줄 여행 일기를 써 봤어요", body: (r,d,i) => [`${r.name} 여행을 마치고 ${d.note} 형태로 세 줄 일기를 썼어요.`, "본 것 하나, 웃었던 일 하나, 다음에 바꾸고 싶은 것 하나만 적는 방식입니다.", ...(i%3?["길게 쓰려다 포기하는 것보다 짧게 남기는 게 제게는 잘 맞았어요."]:[]), "여행 기록을 꾸준히 남기는 요령이 있나요?"], replies: [(r,d)=>`${d.note}처럼 형식을 작게 정하면 부담이 덜하겠어요. ${r.name} 기록도 사진 한 장과 문장 하나면 충분할 것 같아요.`,()=>"저는 자기 전에 가장 웃겼던 일만 적어 보려고요. 세 줄이면 밀리지 않고 이어 갈 수 있겠네요."] },
  { category: "travel-talk", title: "이동 중 음악을 틀지 말지", body: (r,d,i) => [`${r.name}을 둘러보고 이동하는 동안 한 사람은 음악을 듣고 싶고 다른 사람은 조용히 있고 싶어 했어요.`, ...(i%4===0?["처음 한 곡은 같이 듣고 그다음에는 각자 쉬는 쪽으로 정했다는 이야기입니다."]:[]), `${d.photo} 이야기를 나누다 보니 음악이 없어도 심심하지 않았어요.`], replies: [()=>"저라면 서로 듣고 싶은 곡을 한 곡씩 고른 뒤 조용한 시간을 두겠어요. 계속 소리가 있으면 쉬기 어려울 때도 있더라고요.",(r)=>`${r.name} 이야기처럼 대화하고 싶은 사람과 쉬고 싶은 사람을 모두 배려하려면 구간을 나누는 방법이 좋아 보여요.`] },
  { category: "review", title: "마지막 계획을 취소한 날", body: (r,d,i) => [`${r.name}에서 보낸 하루 끝에 마지막 순서를 남겨 두고 그냥 돌아가기로 했어요.`, "처음에는 아쉬웠지만 가방을 내려놓고 나니 무리하지 않은 선택이 마음에 들었다는 후기입니다.", ...(i%2?[`남은 ${d.snack}은 돌아오는 길에 천천히 먹으며 쉬었어요.`]:[]), "계획한 일을 취소하면 아쉬움이 오래 남는 편인가요?"], replies: [()=>"저는 취소한 일을 실패라고 생각하지 않으려고 해요. 즐거웠던 장면이 하나라도 있으면 그날은 충분했다고 적어 둡니다.",(r,d)=>`${r.name} 이야기의 마지막이 ${withObject(d.snack)} 먹으며 쉬는 장면이라 오히려 편안하게 느껴져요.`] },
  { category: "general", title: "겉옷을 몇 벌 챙길지 묻습니다", body: (r,d,i) => [`${r.name} 여행 짐을 싸며 얇은 겉옷을 하나만 넣을지 여분을 챙길지 고민하고 있어요.`, `${d.item}까지 넣고 나니 가방이 금방 차서 옷 부피부터 줄이고 싶습니다.`, ...(i%3===0?["실제 날씨를 전하는 글은 아니고 짐 꾸리기 취향을 묻는 질문이에요."]:[]), "옷을 적게 챙겨도 마음이 놓이는 기준이 있나요?"], replies: [(r,d)=>`저는 색을 맞춰 돌려 입기 쉬운 옷만 고를 것 같아요. ${r.name} 실제 날씨 조언은 아니지만 ${d.item} 자리를 먼저 확보하는 방식은 괜찮네요.`,()=>"입을 가능성이 낮은 여분부터 침대에 꺼내 놓고 마지막에 다시 고르면 생각보다 많이 줄어들어요."] },
  { category: "travel-talk", title: "단체방 투표가 더 어려웠던 이유", body: (r,d,i) => [`친구들과 ${r.name} 여행 계획을 짜며 선택지 네 개를 단체방 투표에 올렸는데 표가 정확히 갈렸어요.`, i%2?"다시 투표하기보다 각자 포기하기 어려운 이유를 한 문장씩 쓰기로 했습니다.":"숫자만 보니 왜 골랐는지 몰라 결정을 못 하겠더라고요.", `${d.note}에 이유까지 적으니 대화가 조금 부드러워졌어요.`], replies: [()=>"투표 전에 ‘꼭 하고 싶음’과 ‘하면 좋음’을 나누면 동점이 나도 정하기 쉬울 것 같아요.",(r,d)=>`${r.name} 선택 자체보다 이유를 듣는 과정이 중요해 보여요. ${withObject(d.note)} 공유하면 말이 짧아도 오해가 줄겠네요.`] },
  { category: "tips", title: "여행 뒤 영수증과 메모 정리", body: (r,d,i) => [`${r.name} 여행 뒤 가방에서 구겨진 종이와 메모가 한꺼번에 나왔어요.`, `${withAnd(d.note)} 사진을 날짜별로 묶어 두니 버릴 것과 남길 것이 보이기 시작했습니다.`, ...(i%4===3?["정리를 미루면 기억도 같이 흐려지는 기분이라 이번에는 바로 해 봤어요."]:[]), "여행이 끝난 날 바로 정리하는 편인가요?"], replies: [(r,d)=>`저는 ${d.note}만 먼저 옮겨 적고 종이는 사진으로 남길지 결정할 것 같아요. ${r.name} 앨범과 같은 제목을 쓰면 찾기도 쉽겠네요.`,()=>"돌아온 날에는 피곤해서 사진에 별표만 하고, 다음 날 짧게 정리하는 방식이 저한테는 현실적일 것 같아요."] },
];

const posts = [];
const comments = [];
const start = Date.UTC(2026, 6, 1, 0, 0, 0);
// Retain all previously published IDs while redistributing synthetic replies.
const commentIds = regions.flatMap((region) => scenarios.flatMap((_, index) =>
  [1, 2].map((reply) => `demo-2026-${region.slug}-${String(index + 1).padStart(2, "0")}-comment-${reply}`)));
const replyCounts = [0, 1, 0, 3, 2, 0, 5, 1, 0, 8];
const extraReplies = [
  "저라면 동행이 가장 중요하게 생각하는 것을 하나씩 적어 보고 우선순위를 맞추겠어요.",
  "계획을 완벽하게 정하기보다 여유 시간을 남겨 두자는 의견에 공감해요.",
  "이런 고민은 출발 전에 함께 이야기하면 서로의 기대를 맞추기 좋겠네요.",
  "저는 선택지를 두 개로 줄여서 동행에게 물어보고 싶어요. 결정 부담이 덜할 것 같습니다.",
  "각자 편한 방식을 먼저 말하고 작은 것부터 맞춰 가면 좋겠어요.",
  "나중에 계획을 바꿀 수도 있으니 한 가지 방법만 고집하지 않으려고요.",
];

for (const [regionIndex, region] of regions.entries()) {
  for (const [scenarioIndex, scenario] of scenarios.entries()) {
    const globalIndex = regionIndex * scenarios.length + scenarioIndex;
    const ordinal = String(scenarioIndex + 1).padStart(2, "0");
    const postId = `demo-2026-${region.slug}-${ordinal}`;
    const createdAt = start + ((globalIndex * 137 + 13) % 360) * 4 * 60 * 60 * 1000;
    const detail = details[regionIndex];
    posts.push({
      id: postId, authorId: `wave-demo-author-${String((globalIndex % 24) + 1).padStart(2, "0")}`, authorName: `데모 여행자 ${String((globalIndex % 24) + 1).padStart(2, "0")}`,
      category: scenario.category, title: `[시연] ${region.name}, ${scenario.title}`,
      content: scenario.body(region, detail, regionIndex).join(" "),
      region: region.name, placeId: null, placeName: null, visitDate: null, fieldReports: [], journalPlaces: [], visitPhotos: [],
      createdAt, updatedAt: createdAt, moderationStatus: "active", demoBatchId: BATCH.id,
      demoLikeCount: (globalIndex * 17 + 7) % 49,
    });
    for (let replyIndex = 0; replyIndex < replyCounts[(scenarioIndex + regionIndex * 3) % replyCounts.length]; replyIndex += 1) {
      const commentIndex = comments.length;
      const commentCreatedAt = createdAt + (23 + replyIndex * 48) * 60 * 1000;
      comments.push({
        id: commentIds[commentIndex], postId,
        authorId: `wave-demo-commenter-${String((commentIndex % 36) + 1).padStart(2, "0")}`, authorName: `데모 답글 ${String((commentIndex % 36) + 1).padStart(2, "0")}`,
        content: `${region.name}의 ‘${scenario.title}’ 이야기라면 ${replyIndex < 2 ? scenario.replies[replyIndex](region, detail, regionIndex) : extraReplies[replyIndex - 2]}`,
        createdAt: commentCreatedAt, updatedAt: commentCreatedAt, moderationStatus: "active", demoBatchId: BATCH.id,
      });
    }
  }
}

await mkdir(new URL("../data/", import.meta.url), { recursive: true });
const target = new URL("../data/community-demo-wave-2026-v1.json", import.meta.url);
await writeFile(target, `${JSON.stringify({ schemaVersion: 1, batch: BATCH, posts, comments }, null, 2)}\n`, "utf8");
console.log(`Wrote ${posts.length} posts and ${comments.length} comments to ${target.pathname}`);
