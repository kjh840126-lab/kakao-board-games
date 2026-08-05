import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Gamepad2, 
  RotateCcw, 
  Settings, 
  ClipboardList, 
  Users, 
  ShoppingCart, 
  UserCheck,
  Plus,
  Edit,
  Eye,
  EyeOff,
  Trash2,
  X,
  Clock,
  Star,
  Users as PlayerIcon,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  LogOut,
  UserPlus,
  LogIn,
  Check,
  Image as ImageIcon,
  Tag,
  Info,
  KeyRound,
  Mail,
  Search,
  AlertCircle,
  UserX,
  UserCheck as UserCheckIcon
} from 'lucide-react';

export type Role = '일반회원' | '운영자' | '탈퇴회원';
export type GameStatus = '대여가능' | '대여중' | '대여불가';
export type RentalStatus = '대여중' | '반납완료';

export interface User {
  userId: string;
  name: string;
  email: string;
  role: Role;
  passwordHash: string;
  penaltyPoints: number;
  penaltyEndDate: string | null;
  createdAt: string;
  lastLoginAt: string;
}

export interface Game {
  gameId: string;
  title: string;
  status: GameStatus;
  minPlayers: number;
  maxPlayers: number;
  playTime: number;
  difficulty: number;
  imageUrl: string;
  description: string;
  isVisible: 'Y' | 'N';
  genres: string[];
  createdAt: string;
}

export interface Rental {
  rentalId: number;
  userId: string;
  gameId: string;
  gameTitle: string;
  status: RentalStatus;
  startDate: string;
  endDate: string;
  returnedAt: string | null;
}

const PRESET_GENRES = ['전략게임', '파티게임', '추상전략', '타일 놓기', '카드게임', '가족게임', '협동게임', '마피아'];

// 로그인 화면용 춘식이 로고 경로
const LOGIN_LOGO_URL = '/logo.png'; 

// 허용 가능한 카카오 계열사 이메일 도메인 목록
const ALLOWED_EMAIL_DOMAINS = [
  'kakaocorp.com',
  'kakaoenterprise.com',
  'kakaomobility.com',
  'kakaopaycorp.com',
  'kakaoent.com',
];

// 날짜 차이 계산 함수 (일 단위)
const getDaysDifference = (dateStr1: string, dateStr2: string) => {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  const diffTime = d1.getTime() - d2.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);

  // localStorage에서 저장된 사용자 정보 불러오기
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('kakao_boardgame_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgotPassword' | 'updatePassword'>('login');
  
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // 회원가입 & 이메일 분리 State
  const [signupForm, setSignupForm] = useState({
    userId: '',
    name: '',
    emailPrefix: '',
    emailDomain: ALLOWED_EMAIL_DOMAINS[0],
    password: '',
    passwordConfirm: '',
  });
  const [isEmailChecked, setIsEmailChecked] = useState(false);

  // 비밀번호 찾기 및 재설정 State
  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [cart, setCart] = useState<Game[]>([]);
  const [activeTab, setActiveTab] = useState<'games' | 'returns' | 'gameAdmin' | 'rentalAdmin' | 'userAdmin'>('games');
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [customGenreInput, setCustomGenreInput] = useState('');

  // 각 페이지별 검색어 State
  const [gameListSearch, setGameListSearch] = useState('');
  const [gameAdminSearch, setGameAdminSearch] = useState('');
  const [userAdminSearch, setUserAdminSearch] = useState('');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchInitialData();

    supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('updatePassword');
      }
    });
  }, []);

  // 탭 변경 시 데이터 비동기 재조회
  useEffect(() => {
    if (currentUser) {
      fetchInitialData();
    }
  }, [activeTab]);

  const fetchInitialData = async () => {
    try {
      const { data: usersData } = await supabase.from('users').select('*');
      if (usersData) {
        const mappedUsers: User[] = await Promise.all(
          usersData.map(async (u) => {
            let currentPenaltyPoints = u.penalty_count || 0;
            let currentPenaltyEndDate = u.penalty_end_date || null;

            if (currentPenaltyEndDate) {
              if (currentPenaltyEndDate < today) {
                currentPenaltyPoints = 0;
                currentPenaltyEndDate = null;

                await supabase.from('users').update({
                  penalty_count: 0,
                  penalty_end_date: null
                }).eq('user_id', u.user_id);
              } else {
                const remainingDays = getDaysDifference(currentPenaltyEndDate, today);
                if (remainingDays !== currentPenaltyPoints) {
                  currentPenaltyPoints = remainingDays;
                  await supabase.from('users').update({
                    penalty_count: remainingDays
                  }).eq('user_id', u.user_id);
                }
              }
            }

            return {
              userId: u.user_id,
              name: u.name,
              email: u.email,
              role: u.role as Role,
              passwordHash: u.password_hash,
              penaltyPoints: currentPenaltyPoints,
              penaltyEndDate: currentPenaltyEndDate,
              createdAt: u.created_at?.split('T')[0] || today,
              lastLoginAt: u.last_login_at || '기록없음'
            };
          })
        );

        setUsers(mappedUsers);

        if (currentUser) {
          const updatedCurrentUser = mappedUsers.find(u => u.userId === currentUser.userId);
          if (updatedCurrentUser) {
            if (updatedCurrentUser.role === '탈퇴회원') {
              alert('회원 계정이 탈퇴 처리되었습니다.');
              handleLogout();
            } else {
              setCurrentUser(updatedCurrentUser);
              localStorage.setItem('kakao_boardgame_user', JSON.stringify(updatedCurrentUser));
            }
          }
        }
      }

      const { data: gamesData } = await supabase.from('games').select('*');
      if (gamesData) {
        setGames(gamesData.map(g => {
          let parsedGenres: string[] = ['보드게임'];
          if (Array.isArray(g.genres)) {
            parsedGenres = g.genres;
          } else if (typeof g.genres === 'string' && g.genres.trim() !== '') {
            parsedGenres = g.genres.split(',').map((s: string) => s.trim());
          }

          return {
            gameId: g.game_id,
            title: g.title,
            status: g.status,
            minPlayers: g.min_players,
            maxPlayers: g.max_players,
            playTime: Number(g.play_time) || 30,
            difficulty: Number(g.difficulty) || 2.0,
            imageUrl: g.image_url || 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=300',
            description: g.description || '',
            isVisible: g.is_visible,
            genres: parsedGenres.length > 0 ? parsedGenres : ['보드게임'],
            createdAt: g.created_at || new Date().toISOString()
          };
        }));
      }

      const { data: rentalsData } = await supabase.from('rentals').select('*');
      if (rentalsData) {
        setRentals(rentalsData.map(r => ({
          rentalId: r.rental_id,
          userId: r.user_id,
          gameId: r.game_id,
          gameTitle: r.game_title,
          status: r.status,
          startDate: r.start_date,
          endDate: r.end_date,
          returnedAt: r.returned_at
        })));
      }
    } catch (err) {
      console.error('Supabase 데이터 로딩 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find((u) => u.userId === loginId && u.passwordHash === loginPassword);
    
    if (!user) {
      alert('아이디 또는 비밀번호가 올바르지 않습니다.');
      return;
    }

    if (user.role === '탈퇴회원') {
      alert('탈퇴 처리된 계정입니다. 운영자에게 문의해 주세요.');
      return;
    }

    const nowStr = new Date().toISOString();
    await supabase.from('users').update({ last_login_at: nowStr }).eq('user_id', user.userId);

    const loggedInUser: User = { 
      ...user, 
      lastLoginAt: nowStr.replace('T', ' ').substring(0, 16) 
    };

    setCurrentUser(loggedInUser);
    localStorage.setItem('kakao_boardgame_user', JSON.stringify(loggedInUser));

    setLoginId('');
    setLoginPassword('');
    setActiveTab('games');
  };

  const handleCheckEmailDuplicate = () => {
    const prefix = signupForm.emailPrefix.trim();
    if (!prefix) {
      alert('이메일 아이디를 입력해 주세요.');
      return;
    }

    const fullEmail = `${prefix}@${signupForm.emailDomain}`.toLowerCase();
    const isDuplicate = users.some((u) => u.email.toLowerCase() === fullEmail);

    if (isDuplicate) {
      alert(`이미 등록된 이메일 주소입니다. (${fullEmail})`);
      setIsEmailChecked(false);
    } else {
      alert(`사용 가능한 이메일 주소입니다. (${fullEmail})`);
      setIsEmailChecked(true);
    }
  };

  const handleFinalSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEmailChecked) {
      alert('이메일 중복 확인을 먼저 진행해 주세요.');
      return;
    }

    if (users.some((u) => u.userId === signupForm.userId)) {
      alert('이미 존재하는 아이디입니다.');
      return;
    }

    if (signupForm.password !== signupForm.passwordConfirm) {
      alert('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    const fullEmail = `${signupForm.emailPrefix.trim()}@${signupForm.emailDomain}`;

    const { error } = await supabase.from('users').insert([
      {
        user_id: signupForm.userId,
        name: signupForm.name,
        email: fullEmail,
        role: '일반회원',
        password_hash: signupForm.password,
      }
    ]);

    if (error) {
      alert('회원가입 실패: ' + error.message);
      return;
    }

    alert('회원가입이 완료되었습니다! 로그인해 주세요.');
    await fetchInitialData();
    
    setAuthMode('login');
    setLoginId(signupForm.userId);
    setSignupForm({ 
      userId: '', 
      name: '', 
      emailPrefix: '', 
      emailDomain: ALLOWED_EMAIL_DOMAINS[0], 
      password: '', 
      passwordConfirm: '' 
    });
    setIsEmailChecked(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanForgotEmail = forgotEmail.trim().toLowerCase();

    const existingUser = users.find(u => u.email.trim().toLowerCase() === cleanForgotEmail);
    if (!existingUser) {
      alert('등록되지 않은 이메일 주소입니다.');
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(cleanForgotEmail, {
      redirectTo: 'https://kakao-board-games.vercel.app',
    });

    if (error) {
      alert('비밀번호 재설정 메일 발송 실패: ' + error.message);
    } else {
      alert(`${cleanForgotEmail}로 비밀번호 재설정 링크를 보냈습니다.\n메일함을 확인해 주세요.`);
      setAuthMode('login');
      setForgotEmail('');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      if (error.message.includes('should be different')) {
        alert('기존 비밀번호와 동일한 비밀번호로는 변경할 수 없습니다.\n새로운 비밀번호를 입력해 주세요.');
      } else {
        alert('비밀번호 변경 실패: ' + error.message);
      }
    } else {
      alert('비밀번호가 성공적으로 변경되었습니다. 변경된 비밀번호로 로그인해 주세요.');
      setAuthMode('login');
      setNewPassword('');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('kakao_boardgame_user');
    setCart([]);
    setIsCartOpen(false);
  };

  const handleUserRoleChange = async (targetUser: User, newRole: Role) => {
    const actionText = newRole === '탈퇴회원' ? '탈퇴' : '복구';
    if (window.confirm(`'${targetUser.name}' 회원님을 ${actionText} 처리하시겠습니까?`)) {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('user_id', targetUser.userId);

      if (error) {
        alert(`${actionText} 처리 실패: ` + error.message);
      } else {
        alert(`'${targetUser.name}' 회원님이 ${actionText} 처리되었습니다.`);
        await fetchInitialData();
      }
    }
  };

  const activeRentalsCount = currentUser 
    ? rentals.filter((r) => r.userId === currentUser.userId && r.status === '대여중').length 
    : 0;

  const isAdmin = currentUser?.role === '운영자';

  const toggleCartItem = (game: Game) => {
    const isAlreadyInCart = cart.some((item) => item.gameId === game.gameId);
    if (isAlreadyInCart) {
      setCart(cart.filter((item) => item.gameId !== game.gameId));
    } else {
      if (cart.length >= 3) {
        alert('장바구니에는 최대 3개까지만 담을 수 있습니다.');
        return;
      }
      setCart([...cart, game]);
    }
  };

  const removeFromCart = (gameId: string) => {
    setCart(cart.filter((item) => item.gameId !== gameId));
  };

  const processCheckout = async () => {
    if (!currentUser) return;

    if (currentUser.penaltyEndDate && currentUser.penaltyEndDate >= today) {
      alert(`패널티로 인해 대여할 수 없습니다.\n(대여 정지 종료일: ${currentUser.penaltyEndDate})`);
      return;
    }

    if (activeRentalsCount + cart.length > 3) {
      alert(`한 회원당 최대 3개까지만 대여 가능합니다.\n(현재 대여중: ${activeRentalsCount}개, 신청: ${cart.length}개)`);
      return;
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 3);
    const endDateStr = endDate.toISOString().split('T')[0];

    const newRentals = cart.map((game) => ({
      user_id: currentUser.userId,
      game_id: game.gameId,
      game_title: game.title,
      status: '대여중',
      start_date: today,
      end_date: endDateStr
    }));

    const { error: rentalError } = await supabase.from('rentals').insert(newRentals);
    if (rentalError) {
      alert('대여 처리 실패: ' + rentalError.message);
      return;
    }

    const rentedGameIds = cart.map((g) => g.gameId);
    await supabase.from('games').update({ status: '대여중' }).in('game_id', rentedGameIds);

    alert('대여가 완료되었습니다.');
    await fetchInitialData();
    setCart([]);
    setIsCartOpen(false);
  };

  const returnGame = async (rentalId: number, gameId: string) => {
    if (!currentUser) return;
    const targetRental = rentals.find(r => r.rentalId === rentalId);
    if (!targetRental) return;

    const nowStr = new Date().toISOString();

    await supabase.from('rentals').update({ status: '반납완료', returned_at: nowStr }).eq('rental_id', rentalId);
    await supabase.from('games').update({ status: '대여가능' }).eq('game_id', gameId);

    const isOverdue = today > targetRental.endDate;
    if (isOverdue) {
      const overdueDays = getDaysDifference(today, targetRental.endDate);
      const newPoints = currentUser.penaltyPoints + overdueDays;

      const penaltyEnd = new Date();
      penaltyEnd.setDate(penaltyEnd.getDate() + newPoints);
      const penaltyEndStr = penaltyEnd.toISOString().split('T')[0];

      await supabase.from('users').update({ 
        penalty_count: newPoints, 
        penalty_end_date: penaltyEndStr 
      }).eq('user_id', currentUser.userId);

      alert(`반납이 완료되었습니다.\n[연체 발생] 연체일수(${overdueDays}일)만큼 패널티 +${overdueDays}점이 부여되었습니다.`);
    } else {
      alert('반납이 완료되었습니다.');
    }

    await fetchInitialData();
  };

  const returnAllGames = async () => {
    if (!currentUser) return;
    const userActiveRentals = rentals.filter((r) => r.userId === currentUser.userId && r.status === '대여중');
    if (userActiveRentals.length === 0) return;

    const rentalIds = userActiveRentals.map(r => r.rentalId);
    const gameIds = userActiveRentals.map(r => r.gameId);
    const nowStr = new Date().toISOString();

    await supabase.from('rentals').update({ status: '반납완료', returned_at: nowStr }).in('rental_id', rentalIds);
    await supabase.from('games').update({ status: '대여가능' }).in('game_id', gameIds);

    let totalOverdueDays = 0;
    userActiveRentals.forEach((r) => {
      if (today > r.endDate) {
        totalOverdueDays += getDaysDifference(today, r.endDate);
      }
    });

    if (totalOverdueDays > 0) {
      const newPoints = currentUser.penaltyPoints + totalOverdueDays;

      const penaltyEnd = new Date();
      penaltyEnd.setDate(penaltyEnd.getDate() + totalOverdueDays);
      const penaltyEndStr = penaltyEnd.toISOString().split('T')[0];

      await supabase.from('users').update({ 
        penalty_count: newPoints, 
        penalty_end_date: penaltyEndStr 
      }).eq('user_id', currentUser.userId);

      alert(`모든 보드게임이 반납되었습니다.\n[연체 발생] 총 연체일수(${totalOverdueDays}일)만큼 패널티 +${totalOverdueDays}점이 부여되었습니다.`);
    } else {
      alert('모든 보드게임이 반납되었습니다.');
    }

    await fetchInitialData();
  };

  const handleToggleGenre = (genreName: string) => {
    if (!editingGame) return;
    const exists = editingGame.genres.includes(genreName);
    
    if (exists) {
      setEditingGame({
        ...editingGame,
        genres: editingGame.genres.filter(g => g !== genreName)
      });
    } else {
      if (editingGame.genres.length >= 3) {
        alert('장르는 최대 3개까지만 선택할 수 있습니다.');
        return;
      }
      setEditingGame({
        ...editingGame,
        genres: [...editingGame.genres, genreName]
      });
    }
  };

  const handleAddCustomGenre = () => {
    if (!editingGame || !customGenreInput.trim()) return;
    if (editingGame.genres.length >= 3) {
      alert('장르는 최대 3개까지만 선택할 수 있습니다.');
      return;
    }
    const newTag = customGenreInput.trim();
    if (!editingGame.genres.includes(newTag)) {
      setEditingGame({
        ...editingGame,
        genres: [...editingGame.genres, newTag]
      });
    }
    setCustomGenreInput('');
  };

  const saveGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGame) return;

    const genresPayload = editingGame.genres.length > 0 ? editingGame.genres : ['보드게임'];

    if (isEditingMode) {
      const { error } = await supabase.from('games').update({
        title: editingGame.title,
        min_players: editingGame.minPlayers,
        max_players: editingGame.maxPlayers,
        play_time: editingGame.playTime,
        difficulty: editingGame.difficulty,
        is_visible: editingGame.isVisible,
        image_url: editingGame.imageUrl,
        genres: genresPayload
      }).eq('game_id', editingGame.gameId);

      if (error) alert('수정 실패: ' + error.message);
      else alert('게임 정보가 수정되었습니다.');
    } else {
      const { error } = await supabase.from('games').insert([{
        game_id: editingGame.gameId,
        title: editingGame.title,
        status: '대여가능',
        min_players: editingGame.minPlayers,
        max_players: editingGame.maxPlayers,
        play_time: editingGame.playTime,
        difficulty: editingGame.difficulty,
        description: '',
        is_visible: editingGame.isVisible,
        image_url: editingGame.imageUrl,
        genres: genresPayload
      }]);

      if (error) alert('등록 실패: ' + error.message);
      else alert('새로운 게임이 등록되었습니다.');
    }

    await fetchInitialData();
    setIsGameModalOpen(false);
  };

  const deleteGame = async (gameId: string, title: string, status: GameStatus) => {
    if (status === '대여중') {
      alert(`'${title}' 게임은 현재 대여 중이므로 삭제할 수 없습니다.`);
      return;
    }

    if (window.confirm(`정말로 '${title}' 게임을 삭제하시겠습니까?`)) {
      const { error } = await supabase.from('games').delete().eq('game_id', gameId);
      if (error) alert('삭제 실패: ' + error.message);
      else alert('게임을 DB에서 삭제했습니다.');
      await fetchInitialData();
    }
  };

  const filteredGameList = [...games]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .filter((g) => g.isVisible === 'Y')
    .filter((g) => g.title.toLowerCase().includes(gameListSearch.trim().toLowerCase()));

  const filteredGameAdminList = [...games]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .filter((g) => g.title.toLowerCase().includes(gameAdminSearch.trim().toLowerCase()));

  const filteredUserAdminList = [...users]
    .sort((a, b) => {
      if (b.createdAt !== a.createdAt) {
        return b.createdAt.localeCompare(a.createdAt);
      }
      return b.userId.localeCompare(a.userId);
    })
    .filter((u) => {
      const query = userAdminSearch.trim().toLowerCase();
      if (!query) return true;
      return (
        u.name.toLowerCase().includes(query) ||
        u.userId.toLowerCase().includes(query)
      );
    });

  const returnedRentalsList = rentals
    .filter((r) => currentUser && r.userId === currentUser.userId && r.status === '반납완료')
    .sort((a, b) => {
      const dateA = a.returnedAt || a.startDate;
      const dateB = b.returnedAt || b.startDate;
      if (dateB !== dateA) {
        return dateB.localeCompare(dateA);
      }
      return b.rentalId - a.rentalId;
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-semibold text-xs tracking-tight">
        데이터베이스 연결 중...
      </div>
    );
  }

  // -------------------------------------------------------------
  // [A] 비로그인 화면 (로그인 / 회원가입)
  // -------------------------------------------------------------
  if (!currentUser) {
    const hasEnteredPasswordConfirm = signupForm.passwordConfirm.length > 0;
    const isPasswordMatching = 
      hasEnteredPasswordConfirm && signupForm.password === signupForm.passwordConfirm;

    return (
      <div className="min-h-screen bg-slate-50 flex justify-center items-center p-4">
        {/* -mt-12 클래스를 적용하여 모바일 하단 브라우저 창과 로그인 버튼 사이의 공간을 확보했습니다. */}
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200/80 -mt-12">
          
          <div className="bg-[#FEE500] px-6 py-8 text-center border-b border-amber-300/40 flex items-center justify-center">
            <img 
              src={LOGIN_LOGO_URL} 
              alt="KAKAO BOARD GAMES" 
              className="h-48 w-auto object-contain drop-shadow-sm" 
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>

          {(authMode === 'login' || authMode === 'signup') && (
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  authMode === 'login' 
                    ? 'text-slate-900 border-b-2 border-slate-900 bg-slate-50' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <LogIn size={15} /> 로그인
              </button>
              <button
                onClick={() => setAuthMode('signup')}
                className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  authMode === 'signup' 
                    ? 'text-slate-900 border-b-2 border-slate-900 bg-slate-50' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <UserPlus size={15} /> 회원가입
              </button>
            </div>
          )}

          <div className="p-6">
            {/* 1. 로그인 폼 */}
            {authMode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4 text-xs">
                <div>
                  <label 
                    style={{ textAlign: 'left' }} 
                    className="block text-slate-900 font-bold mb-1.5 text-left"
                  >
                    아이디 (LDAP)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="예: user.kakao"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    className="w-full border border-slate-300 p-3 rounded-xl text-slate-900 focus:outline-none focus:border-slate-800 bg-slate-50/50"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label 
                      style={{ textAlign: 'left' }} 
                      className="block text-slate-900 font-bold text-left"
                    >
                      비밀번호
                    </label>
                    <button
                      type="button"
                      onClick={() => setAuthMode('forgotPassword')}
                      className="text-[11px] text-slate-500 hover:text-slate-900 font-medium underline"
                    >
                      비밀번호를 잊으셨나요?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="비밀번호 입력"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full border border-slate-300 p-3 rounded-xl text-slate-900 focus:outline-none focus:border-slate-800 bg-slate-50/50"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition text-xs shadow-sm mt-2"
                >
                  로그인
                </button>
              </form>
            )}

            {/* 2. 회원가입 폼 */}
            {authMode === 'signup' && (
              <form onSubmit={handleFinalSignup} className="space-y-3.5 text-xs">
                <div>
                  <label 
                    style={{ textAlign: 'left' }} 
                    className="block text-slate-900 font-bold mb-1 text-left"
                  >
                    아이디 (LDAP)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="예: new.kakao"
                    value={signupForm.userId}
                    onChange={(e) => setSignupForm({ ...signupForm, userId: e.target.value })}
                    className="w-full border border-slate-300 p-2.5 rounded-xl text-slate-900 bg-slate-50/50 focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label 
                    style={{ textAlign: 'left' }} 
                    className="block text-slate-900 font-bold mb-1 text-left"
                  >
                    이름
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="홍길동"
                    value={signupForm.name}
                    onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                    className="w-full border border-slate-300 p-2.5 rounded-xl text-slate-900 bg-slate-50/50 focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label 
                    style={{ textAlign: 'left' }} 
                    className="block text-slate-900 font-bold mb-1 text-left"
                  >
                    이메일 주소
                  </label>
                  
                  <div className="flex items-center gap-1 mb-1.5">
                    <input
                      type="text"
                      required
                      placeholder="이메일 아이디"
                      value={signupForm.emailPrefix}
                      onChange={(e) => {
                        setSignupForm({ ...signupForm, emailPrefix: e.target.value });
                        setIsEmailChecked(false);
                      }}
                      className="flex-1 min-w-0 border border-slate-300 p-2.5 rounded-xl text-slate-900 bg-slate-50/50 focus:outline-none focus:border-slate-800"
                    />
                    <span className="text-slate-500 font-bold">@</span>
                    <select
                      value={signupForm.emailDomain}
                      onChange={(e) => {
                        setSignupForm({ ...signupForm, emailDomain: e.target.value });
                        setIsEmailChecked(false);
                      }}
                      className="border border-slate-300 p-2.5 rounded-xl text-slate-900 bg-slate-50/50 focus:outline-none focus:border-slate-800 text-[11px] font-semibold"
                    >
                      {ALLOWED_EMAIL_DOMAINS.map((domain) => (
                        <option key={domain} value={domain}>
                          {domain}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={handleCheckEmailDuplicate}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs transition ${
                        isEmailChecked
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      {isEmailChecked ? '✓ 이메일 중복 확인 완료' : '이메일 중복 확인'}
                    </button>
                  </div>
                </div>

                <div>
                  <label 
                    style={{ textAlign: 'left' }} 
                    className="block text-slate-900 font-bold mb-1 text-left"
                  >
                    비밀번호
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="비밀번호 입력"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    className="w-full border border-slate-300 p-2.5 rounded-xl text-slate-900 bg-slate-50/50 focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label 
                    style={{ textAlign: 'left' }} 
                    className="block text-slate-900 font-bold mb-1 text-left"
                  >
                    비밀번호 확인
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="비밀번호 재입력"
                    value={signupForm.passwordConfirm}
                    onChange={(e) => setSignupForm({ ...signupForm, passwordConfirm: e.target.value })}
                    className={`w-full border p-2.5 rounded-xl text-slate-900 focus:outline-none transition ${
                      hasEnteredPasswordConfirm
                        ? isPasswordMatching
                          ? 'border-emerald-600 bg-emerald-50/30'
                          : 'border-rose-600 bg-rose-50/30'
                        : 'border-slate-300 bg-slate-50/50'
                    }`}
                  />
                  {hasEnteredPasswordConfirm && (
                    <p style={{ textAlign: 'left' }} className={`text-[11px] mt-1 font-semibold text-left ${isPasswordMatching ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {isPasswordMatching ? '비밀번호가 일치합니다.' : '비밀번호가 일치하지 않습니다.'}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!isEmailChecked || (hasEnteredPasswordConfirm && !isPasswordMatching)}
                  className={`w-full font-bold py-3.5 rounded-xl transition text-xs shadow-sm mt-3 ${
                    !isEmailChecked || (hasEnteredPasswordConfirm && !isPasswordMatching)
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-[#FEE500] text-slate-900 hover:bg-amber-400'
                  }`}
                >
                  가입 완료하기
                </button>
              </form>
            )}

            {/* 3. 비밀번호 찾기 폼 */}
            {authMode === 'forgotPassword' && (
              <form onSubmit={handleForgotPassword} className="space-y-4 text-xs">
                <div className="text-center space-y-1 mb-2">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center justify-center gap-1.5">
                    <Mail size={16} /> 비밀번호 찾기
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
                  </p>
                </div>

                <div>
                  <label 
                    style={{ textAlign: 'left' }} 
                    className="block text-slate-900 font-bold mb-1.5 text-left"
                  >
                    가입 이메일 주소
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="user@kakaocorp.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full border border-slate-300 p-3 rounded-xl text-slate-900 focus:outline-none focus:border-slate-800 bg-slate-50/50"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="flex-1 bg-slate-100 py-3 rounded-xl font-bold text-slate-700 hover:bg-slate-200 transition"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#FEE500] text-slate-900 py-3 rounded-xl font-bold hover:bg-amber-400 transition"
                  >
                    재설정 메일 발송
                  </button>
                </div>
              </form>
            )}

            {/* 4. 비밀번호 재설정 폼 */}
            {authMode === 'updatePassword' && (
              <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs">
                <div className="text-center space-y-1 mb-2">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center justify-center gap-1.5">
                    <KeyRound size={16} /> 신규 비밀번호 설정
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    새롭게 사용할 비밀번호를 입력해 주세요.
                  </p>
                </div>

                <div>
                  <label 
                    style={{ textAlign: 'left' }} 
                    className="block text-slate-900 font-bold mb-1.5 text-left"
                  >
                    새 비밀번호
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="새로운 비밀번호 입력"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-slate-300 p-3 rounded-xl text-slate-900 focus:outline-none focus:border-slate-800 bg-slate-50/50"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition text-xs shadow-sm mt-2"
                >
                  비밀번호 변경 완료
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // [B] 메인 서비스 화면
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-100 flex justify-center">
      <div className="w-full max-w-md bg-white h-[100dvh] flex flex-col shadow-xl relative overflow-hidden border-x border-slate-200/60">
        
        {/* 고정 상단 헤더 */}
        <header 
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }} 
          className="bg-[#FEE500] px-4 pb-4 flex-shrink-0 z-20 shadow-sm flex justify-between items-center border-b border-amber-300/40"
        >
          <div>
            <img 
              src="/header_logo.png" 
              alt="kakao board games" 
              className="h-7 w-auto object-contain drop-shadow-sm mb-1"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            {/* 사용자 이름 및 패널티 정보 안내 영역 */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold" style={{ color: '#0f172a' }}>
              <div className="flex items-center gap-1">
                <UserCheck size={14} style={{ color: '#0f172a' }} />
                <span>{currentUser.name} ({currentUser.role})</span>
              </div>

              {currentUser.penaltyPoints > 0 && (
                <div className="flex items-center gap-1">
                  <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-0.5 font-extrabold shadow-sm">
                    <AlertCircle size={10} /> 패널티 {currentUser.penaltyPoints}점
                  </span>
                  {currentUser.penaltyEndDate && (
                    <span className="text-[10px] text-rose-700 font-extrabold bg-rose-100 px-1.5 py-0.5 rounded-md border border-rose-200">
                      (~{currentUser.penaltyEndDate} 대여불가)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 로그아웃 아이콘 버튼 */}
          <button
            onClick={handleLogout}
            title="로그아웃"
            className="p-2 bg-amber-400/80 rounded-xl hover:bg-amber-400 font-bold transition flex items-center justify-center shadow-sm"
            style={{ color: '#0f172a' }}
          >
            <LogOut size={18} />
          </button>
        </header>

        {/* 독립 스크롤 영역 */}
        <main className="flex-1 p-4 overflow-y-auto relative pb-8">
          {activeTab === 'games' && (
            <div className="space-y-4">
              <div className="bg-slate-900 text-white p-3.5 rounded-2xl text-xs flex items-center gap-2.5 shadow-sm">
                <Info size={16} className="text-[#FEE500] flex-shrink-0" />
                <span className="leading-tight">1인당 최대 <strong className="text-[#FEE500] font-bold">3개</strong>까지 대여하실 수 있습니다.</span>
              </div>

              {/* 게임목록 - 게임명 검색창 */}
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="게임명 검색..."
                  value={gameListSearch}
                  onChange={(e) => setGameListSearch(e.target.value)}
                  className="w-full border border-slate-200 pl-10 pr-9 py-2.5 rounded-xl text-xs bg-slate-50/50 text-slate-900 focus:outline-none focus:border-slate-800 transition"
                />
                {gameListSearch && (
                  <button
                    onClick={() => setGameListSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="grid gap-3">
                {filteredGameList.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-200 text-xs text-slate-400 rounded-2xl">
                    '{gameListSearch}' 검색 결과가 없습니다.
                  </div>
                ) : (
                  filteredGameList.map((game) => {
                    const isAvailable = game.status === '대여가능';
                    const isSelectedInCart = cart.some((item) => item.gameId === game.gameId);

                    // 대여중인 게임의 반납예정일 정보 조회
                    const activeRental = rentals.find((r) => r.gameId === game.gameId && r.status === '대여중');
                    const isOverdue = activeRental ? today > activeRental.endDate : false;
                    const overdueDays = (activeRental && isOverdue) ? getDaysDifference(today, activeRental.endDate) : 0;

                    return (
                      <div key={game.gameId} className="border border-slate-200/80 rounded-2xl p-3.5 flex gap-3.5 bg-white shadow-sm hover:border-slate-300 transition">
                        <img 
                          src={game.imageUrl} 
                          alt={game.title} 
                          className="w-20 h-20 object-cover rounded-xl bg-slate-100 flex-shrink-0 border border-slate-100"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=300';
                          }}
                        />
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start">
                              <h3 className="font-bold text-slate-900 text-sm truncate">{game.title}</h3>
                              <span className="text-[10px] text-slate-400 font-mono flex-shrink-0 ml-1">{game.gameId}</span>
                            </div>
                            
                            <div className="flex gap-2.5 text-[11px] text-slate-600 font-semibold mt-1.5">
                              <span className="flex items-center gap-1"><PlayerIcon size={12} className="text-slate-400" /> {game.minPlayers}-{game.maxPlayers}명</span>
                              <span className="flex items-center gap-1"><Clock size={12} className="text-slate-400" /> {game.playTime}분</span>
                              <span className="flex items-center gap-1"><Star size={12} className="text-amber-500 fill-amber-500" /> {game.difficulty}</span>
                            </div>
                          </div>

                          {/* 장르 태그 고정 영역 + 버튼 가변 구조 */}
                          <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100">
                            {/* 장르 태그 영역 */}
                            <div className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
                              {game.genres.map((genre) => (
                                <span key={genre} className="text-[9px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-bold whitespace-nowrap flex-shrink-0">
                                  {genre}
                                </span>
                              ))}
                            </div>

                            {/* 버튼 영역 */}
                            <div className="flex-shrink-0">
                              {isAvailable ? (
                                <button
                                  onClick={() => toggleCartItem(game)}
                                  className={`px-3 py-1.5 text-xs rounded-xl font-bold flex items-center justify-center gap-1 transition ${
                                    isSelectedInCart
                                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                                      : 'bg-[#FEE500] text-slate-900 hover:bg-amber-400'
                                  }`}
                                >
                                  {isSelectedInCart ? <><Check size={13} /> 선택취소</> : '대여가능'}
                                </button>
                              ) : (
                                <div>
                                  {isOverdue ? (
                                    <span className="px-2.5 py-1 text-[10px] rounded-xl font-extrabold bg-rose-100 text-rose-700 border border-rose-200 inline-block">
                                      대여중 (연체 {overdueDays}일)
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 text-[10px] rounded-xl font-bold bg-slate-100 text-slate-600 border border-slate-200 inline-block">
                                      대여중 ({activeRental?.endDate?.substring(5)} 반납예정)
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'returns' && (
            <div className="space-y-5">
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex justify-between items-center shadow-sm">
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] text-slate-400 font-medium">현재 대여 중인 게임</span>
                  <span className="text-lg font-black text-[#FEE500]">{activeRentalsCount} / 3 개</span>
                </div>
                {activeRentalsCount > 0 && (
                  <button
                    onClick={returnAllGames}
                    className="bg-[#FEE500] text-slate-900 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 hover:bg-amber-400 transition ml-3 flex-shrink-0"
                  >
                    <RotateCcw size={14} /> 일괄 반납
                  </button>
                )}
              </div>

              <section className="space-y-2.5">
                <h3 style={{ color: '#0f172a', fontWeight: 800, fontSize: '14px' }} className="tracking-tight flex items-center gap-2">
                  <span className="w-1.5 h-3.5 bg-slate-900 rounded-full inline-block"></span>
                  현재 대여 중인 게임
                </h3>
                {rentals.filter((r) => r.userId === currentUser.userId && r.status === '대여중').length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-200 text-xs text-slate-400 rounded-2xl">대여 중인 보드게임이 없습니다.</div>
                ) : (
                  rentals.filter((r) => r.userId === currentUser.userId && r.status === '대여중').map((rental) => {
                    const isOverdue = today > rental.endDate;
                    const overdueDays = isOverdue ? getDaysDifference(today, rental.endDate) : 0;

                    return (
                      <div key={rental.rentalId} className={`border p-3.5 rounded-2xl flex justify-between items-center ${isOverdue ? 'border-rose-300 bg-rose-50/40' : 'border-amber-300/60 bg-amber-50/40'}`}>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{rental.gameTitle}</h4>
                          <div className="text-[11px] text-slate-700 mt-1 space-y-0.5">
                            <div>대여일: {rental.startDate}</div>
                            <div>
                              반납예정일:{' '}
                              {isOverdue ? (
                                <strong className="text-rose-600 font-extrabold">
                                  {rental.endDate} (연체 {overdueDays}일)
                                </strong>
                              ) : (
                                <strong className="text-slate-900 font-bold">
                                  {rental.endDate}
                                </strong>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => returnGame(rental.rentalId, rental.gameId)}
                          className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-slate-800 transition"
                        >
                          반납
                        </button>
                      </div>
                    );
                  })
                )}
              </section>

              <section className="space-y-2.5">
                <h3 style={{ color: '#0f172a', fontWeight: 800, fontSize: '14px' }} className="tracking-tight flex items-center gap-2">
                  <span className="w-1.5 h-3.5 bg-slate-400 rounded-full inline-block"></span>
                  대여 및 반납 이력
                </h3>
                {returnedRentalsList.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-200 text-xs text-slate-400 rounded-2xl">반납 이력이 없습니다.</div>
                ) : (
                  returnedRentalsList.map((rental) => {
                    const returnedDate = rental.returnedAt?.split('T')[0] || rental.startDate;
                    const isLateReturn = returnedDate > rental.endDate;
                    const overdueDays = isLateReturn ? getDaysDifference(returnedDate, rental.endDate) : 0;

                    return (
                      <div key={rental.rentalId} className="border border-slate-200/80 p-3.5 rounded-2xl flex justify-between items-center bg-white">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 size={15} className="text-emerald-600" />
                            <h4 className="font-bold text-slate-900 text-xs">{rental.gameTitle}</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            대여일: {rental.startDate} | 반납일:{' '}
                            {isLateReturn ? (
                              <strong className="text-rose-600 font-extrabold">
                                {returnedDate} (연체 {overdueDays}일)
                              </strong>
                            ) : (
                              <span>{returnedDate}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </section>
            </div>
          )}

          {/* [운영자] 1. 게임 등록 및 관리 */}
          {activeTab === 'gameAdmin' && isAdmin && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                <div>
                  <h2 style={{ color: '#0f172a', fontWeight: 900, fontSize: '16px' }} className="tracking-tight flex items-center gap-2">
                    <span className="w-2 h-4 bg-[#FEE500] rounded-sm inline-block border border-amber-400"></span>
                    게임 등록 및 관리
                  </h2>
                  <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 500 }} className="mt-0.5">
                    보드게임 목록을 추가하거나 수정/삭제합니다.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsEditingMode(false);
                    setEditingGame({
                      gameId: '',
                      title: '',
                      status: '대여가능',
                      minPlayers: 2,
                      maxPlayers: 4,
                      playTime: 30,
                      difficulty: 2.0,
                      imageUrl: '',
                      description: '',
                      isVisible: 'Y',
                      genres: ['전략게임'],
                      createdAt: new Date().toISOString()
                    });
                    setIsGameModalOpen(true);
                  }}
                  className="bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 hover:bg-slate-800 transition shadow-sm"
                >
                  <Plus size={14} /> 게임 추가
                </button>
              </div>

              {/* 게임관리 - 게임명 검색창 */}
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="관리할 게임명 검색..."
                  value={gameAdminSearch}
                  onChange={(e) => setGameAdminSearch(e.target.value)}
                  className="w-full border border-slate-200 pl-10 pr-9 py-2.5 rounded-xl text-xs bg-slate-50/50 text-slate-900 focus:outline-none focus:border-slate-800 transition"
                />
                {gameAdminSearch && (
                  <button
                    onClick={() => setGameAdminSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {filteredGameAdminList.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-slate-200 text-xs text-slate-400 rounded-2xl">
                    '{gameAdminSearch}' 검색 결과가 없습니다.
                  </div>
                ) : (
                  filteredGameAdminList.map((game) => (
                    <div key={game.gameId} className="border border-slate-200/80 p-3 rounded-2xl flex justify-between items-center bg-white shadow-sm">
                      <div className="flex items-center gap-3">
                        <img 
                          src={game.imageUrl} 
                          alt={game.title} 
                          className="w-12 h-12 object-cover rounded-xl bg-slate-100 border border-slate-100" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=300';
                          }}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-slate-900 text-xs">{game.title}</h3>
                            <span className="text-[10px] text-slate-400 font-mono">({game.gameId})</span>
                            {game.isVisible === 'Y' ? (
                              <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5"><Eye size={11} /> 노출</span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold flex items-center gap-0.5"><EyeOff size={11} /> 숨김</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5">{game.minPlayers}~{game.maxPlayers}인 | {game.playTime}분 | 난이도 {game.difficulty}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setIsEditingMode(true);
                            setEditingGame(game);
                            setIsGameModalOpen(true);
                          }}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => deleteGame(game.gameId, game.title, game.status)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* [운영자] 2. 대여 및 연체 현황 */}
          {activeTab === 'rentalAdmin' && isAdmin && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-slate-200/80">
                <h2 style={{ color: '#0f172a', fontWeight: 900, fontSize: '16px' }} className="tracking-tight flex items-center gap-2">
                  <span className="w-2 h-4 bg-[#FEE500] rounded-sm inline-block border border-amber-400"></span>
                  대여 및 연체 현황
                </h2>
                <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 500 }} className="mt-0.5">
                  현재 진행 중인 대여 목록과 연체 내역을 확인합니다.
                </p>
              </div>

              <div className="space-y-2.5">
                {rentals.filter((r) => r.status === '대여중').map((rental) => {
                  const isOverdue = today > rental.endDate;
                  const overdueDays = isOverdue ? getDaysDifference(today, rental.endDate) : 0;

                  return (
                    <div key={rental.rentalId} className={`p-3.5 rounded-2xl border ${isOverdue ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200/80 bg-white'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] text-slate-500 font-mono block">대여회원: {rental.userId}</span>
                          <h3 className="font-bold text-slate-900 text-xs mt-0.5">
                            {rental.gameTitle} <span className="text-slate-400 font-mono text-[10px]">({rental.gameId})</span>
                          </h3>
                        </div>
                        {isOverdue && (
                          <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle size={10} /> 연체 ({overdueDays}일)
                          </span>
                        )}
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                        <span>대여일: {rental.startDate} | 반납예정일: {rental.endDate}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* [운영자] 3. 회원 관리 */}
          {activeTab === 'userAdmin' && isAdmin && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-slate-200/80">
                <h2 style={{ color: '#0f172a', fontWeight: 900, fontSize: '16px' }} className="tracking-tight flex items-center gap-2">
                  <span className="w-2 h-4 bg-[#FEE500] rounded-sm inline-block border border-amber-400"></span>
                  회원 관리
                </h2>
                <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 500 }} className="mt-0.5">
                  등록된 회원 목록 및 패널티 현황을 조회하고 회원 상태를 관리합니다.
                </p>
              </div>

              {/* 회원관리 - 회원명 및 회원ID 통합 검색창 */}
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="회원명 또는 회원 ID 검색..."
                  value={userAdminSearch}
                  onChange={(e) => setUserAdminSearch(e.target.value)}
                  className="w-full border border-slate-200 pl-10 pr-9 py-2.5 rounded-xl text-xs bg-slate-50/50 text-slate-900 focus:outline-none focus:border-slate-800 transition"
                />
                {userAdminSearch && (
                  <button
                    onClick={() => setUserAdminSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {filteredUserAdminList.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-slate-200 text-xs text-slate-400 rounded-2xl">
                    '{userAdminSearch}' 검색 결과가 없습니다.
                  </div>
                ) : (
                  filteredUserAdminList.map((user) => {
                    const isWithdrawn = user.role === '탈퇴회원';

                    return (
                      <div key={user.userId} className={`border p-3.5 rounded-2xl space-y-2 shadow-sm ${isWithdrawn ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200/80'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className={`font-bold text-xs ${isWithdrawn ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{user.name}</h3>
                              <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                                user.role === '운영자' 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : isWithdrawn 
                                  ? 'bg-rose-100 text-rose-700' 
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {user.role}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">{user.userId} | {user.email}</p>
                          </div>

                          {/* 탈퇴 / 복구 버튼 */}
                          {user.role === '일반회원' && (
                            <button
                              onClick={() => handleUserRoleChange(user, '탈퇴회원')}
                              className="px-2.5 py-1 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition flex items-center gap-1"
                            >
                              <UserX size={12} /> 탈퇴
                            </button>
                          )}
                          {user.role === '탈퇴회원' && (
                            <button
                              onClick={() => handleUserRoleChange(user, '일반회원')}
                              className="px-2.5 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition flex items-center gap-1"
                            >
                              <UserCheckIcon size={12} /> 복구
                            </button>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex justify-between text-[11px] text-slate-500">
                          <span>가입일: {user.createdAt}</span>
                          <span className="font-semibold flex items-center gap-1">
                            <ShieldAlert size={13} className={user.penaltyPoints > 0 ? 'text-rose-600' : 'text-slate-400'} />
                            패널티: {user.penaltyPoints}점
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </main>

        {/* 플로팅 장바구니 버튼 */}
        <div className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+84px)] right-4 pointer-events-none z-20">
          <button
            onClick={() => setIsCartOpen(true)}
            className="pointer-events-auto relative p-3.5 bg-slate-900 text-white rounded-full hover:bg-slate-800 active:scale-95 transition-all shadow-xl border border-slate-700/50 flex items-center justify-center"
            title="장바구니 열기"
          >
            <ShoppingCart size={20} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                {cart.length}
              </span>
            )}
          </button>
        </div>

        {/* 고정 하단 네비게이션 */}
        <nav className="bg-white border-t border-slate-200 flex justify-around px-2 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] flex-shrink-0 z-20 shadow-md">
          <button onClick={() => setActiveTab('games')} className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'games' ? 'text-slate-900' : 'text-slate-400'}`}>
            <Gamepad2 size={20} />
            <span className="mt-1">게임목록</span>
          </button>
          <button onClick={() => setActiveTab('returns')} className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'returns' ? 'text-slate-900' : 'text-slate-400'}`}>
            <RotateCcw size={20} />
            <span className="mt-1">반납/히스토리</span>
          </button>
          {isAdmin && (
            <>
              <button onClick={() => setActiveTab('gameAdmin')} className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'gameAdmin' ? 'text-slate-900' : 'text-slate-400'}`}>
                <Settings size={20} />
                <span className="mt-1">게임관리</span>
              </button>
              <button onClick={() => setActiveTab('rentalAdmin')} className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'rentalAdmin' ? 'text-slate-900' : 'text-slate-400'}`}>
                <ClipboardList size={20} />
                <span className="mt-1">대여/연체</span>
              </button>
              <button onClick={() => setActiveTab('userAdmin')} className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'userAdmin' ? 'text-slate-900' : 'text-slate-400'}`}>
                <Users size={20} />
                <span className="mt-1">회원관리</span>
              </button>
            </>
          )}
        </nav>

        {/* 장바구니 Drawer 모달 */}
        {isCartOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end">
            <div className="w-full max-w-xs bg-white h-full flex flex-col shadow-2xl">
              <div className="p-4 bg-[#FEE500] flex justify-between items-center font-bold text-slate-900 text-sm">
                <span>장바구니 ({cart.length} / 3)</span>
                <button onClick={() => setIsCartOpen(false)}><X size={18} /></button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-2">
                {cart.length === 0 ? (
                  <div className="text-center py-16 text-xs text-slate-400 font-medium">담긴 게임이 없습니다.</div>
                ) : (
                  cart.map((game) => (
                    <div key={game.gameId} className="flex justify-between items-center border border-slate-200/80 p-3 rounded-xl bg-white shadow-sm">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{game.title}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">{game.minPlayers}~{game.maxPlayers}인 | {game.playTime}분</p>
                      </div>
                      <button onClick={() => removeFromCart(game.gameId)} className="text-slate-400 hover:text-rose-600 p-1"><Trash2 size={15} /></button>
                    </div>
                  ))
                )}
              </div>
              {cart.length > 0 && (
                <div className="p-4 bg-slate-50 border-t border-slate-200">
                  <button onClick={processCheckout} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-xs hover:bg-slate-800 transition shadow-sm">
                    선택한 게임 대여하기
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 게임 등록/수정 모달 */}
        {isGameModalOpen && editingGame && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-3.5 max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">{isEditingMode ? '게임 정보 수정' : '신규 게임 등록'}</h3>
              <form onSubmit={saveGame} className="space-y-3 text-xs">
                
                <div>
                  <label className="font-bold block mb-1.5 text-slate-900 flex items-center gap-1">
                    <ImageIcon size={13} /> 이미지 URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={editingGame.imageUrl}
                    onChange={(e) => setEditingGame({ ...editingGame, imageUrl: e.target.value })}
                    className="w-full border border-slate-300 p-3 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-slate-800 bg-slate-50/50"
                  />
                  <div className="mt-2 flex items-center gap-2.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    <img 
                      src={editingGame.imageUrl || 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=300'} 
                      alt="미리보기" 
                      className="w-10 h-10 object-cover rounded-lg bg-slate-200 flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=300';
                      }}
                    />
                    <span className="text-[10px] text-slate-500">
                      이미지 URL을 입력하면 왼쪽에 미리보기가 등록됩니다.
                    </span>
                  </div>
                </div>

                <div>
                  <label className="font-bold block mb-1.5 text-slate-900">보드게임 ID</label>
                  <input
                    type="text"
                    required
                    disabled={isEditingMode}
                    placeholder="예: KG0001"
                    value={editingGame.gameId}
                    onChange={(e) => setEditingGame({ ...editingGame, gameId: e.target.value })}
                    className={`w-full border p-3 rounded-xl text-xs text-slate-900 ${isEditingMode ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : 'border-slate-300 bg-slate-50/50'}`}
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1.5 text-slate-900">게임명</label>
                  <input
                    type="text"
                    required
                    placeholder="보드게임 이름"
                    value={editingGame.title}
                    onChange={(e) => setEditingGame({ ...editingGame, title: e.target.value })}
                    className="w-full border border-slate-300 p-3 rounded-xl text-slate-900 text-xs bg-slate-50/50 focus:outline-none focus:border-slate-800"
                  />
                </div>

                {/* 장르 선택 (최대 3개) */}
                <div>
                  <label className="font-bold block mb-1.5 text-slate-900 flex items-center justify-between">
                    <span className="flex items-center gap-1"><Tag size={13} /> 장르 선택 (최대 3개)</span>
                    <span className="text-[10px] text-amber-600 font-extrabold">{editingGame.genres.length} / 3 개</span>
                  </label>
                  
                  <div className="flex flex-wrap gap-1 mb-2">
                    {PRESET_GENRES.map((preset) => {
                      const isSelected = editingGame.genres.includes(preset);
                      const isMaxReached = editingGame.genres.length >= 3 && !isSelected;

                      return (
                        <button
                          key={preset}
                          type="button"
                          disabled={isMaxReached}
                          onClick={() => handleToggleGenre(preset)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                            isSelected
                              ? 'bg-slate-900 text-white'
                              : isMaxReached
                              ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {preset}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      disabled={editingGame.genres.length >= 3}
                      placeholder={editingGame.genres.length >= 3 ? "최대 3개 선택 완료" : "기타 장르 입력 (예: 추리)"}
                      value={customGenreInput}
                      onChange={(e) => setCustomGenreInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomGenre();
                        }
                      }}
                      className="flex-1 border border-slate-300 p-2.5 rounded-xl text-xs bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                    <button
                      type="button"
                      disabled={editingGame.genres.length >= 3}
                      onClick={handleAddCustomGenre}
                      className="bg-slate-800 text-white px-3.5 rounded-xl text-xs font-bold disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                      추가
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold block mb-1.5 text-slate-900">최소인원 (명)</label>
                    <input
                      type="number"
                      min={1}
                      value={editingGame.minPlayers}
                      onChange={(e) => setEditingGame({ ...editingGame, minPlayers: Number(e.target.value) })}
                      className="w-full border border-slate-300 p-3 rounded-xl text-slate-900 text-xs bg-slate-50/50"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1.5 text-slate-900">최대인원 (명)</label>
                    <input
                      type="number"
                      min={1}
                      value={editingGame.maxPlayers}
                      onChange={(e) => setEditingGame({ ...editingGame, maxPlayers: Number(e.target.value) })}
                      className="w-full border border-slate-300 p-3 rounded-xl text-slate-900 text-xs bg-slate-50/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold block mb-1.5 text-slate-900">플레이타임 (분)</label>
                    <input
                      type="number"
                      min={1}
                      value={editingGame.playTime}
                      onChange={(e) => setEditingGame({ ...editingGame, playTime: Number(e.target.value) })}
                      className="w-full border border-slate-300 p-3 rounded-xl text-slate-900 text-xs bg-slate-50/50"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1.5 text-slate-900">난이도 (1.0~5.0)</label>
                    <input
                      type="number"
                      step="0.1"
                      min={1.0}
                      max={5.0}
                      value={editingGame.difficulty}
                      onChange={(e) => setEditingGame({ ...editingGame, difficulty: Number(e.target.value) })}
                      className="w-full border border-slate-300 p-3 rounded-xl text-slate-900 text-xs bg-slate-50/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold block mb-1.5 text-slate-900">노출 여부</label>
                  <select
                    value={editingGame.isVisible}
                    onChange={(e) => setEditingGame({ ...editingGame, isVisible: e.target.value as 'Y' | 'N' })}
                    className="w-full border border-slate-300 p-3 rounded-xl text-slate-900 text-xs bg-slate-50/50"
                  >
                    <option value="Y">노출 (Y)</option>
                    <option value="N">숨김 (N)</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setIsGameModalOpen(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold text-slate-700 hover:bg-slate-200 transition">취소</button>
                  <button type="submit" className="flex-1 bg-[#FEE500] text-slate-900 py-3 rounded-xl font-bold hover:bg-amber-400 transition">저장</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}