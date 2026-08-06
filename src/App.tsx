import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { 
  Boxes,
  PackageCheck,
  ShoppingCart, 
  UserCheck,
  Plus,
  Edit,
  Eye,
  EyeOff,
  Trash2,
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  LogOut,
  UserPlus,
  LogIn,
  Check,
  Image as ImageIcon,
  Tag,
  KeyRound,
  Mail,
  Search,
  AlertCircle,
  UserX,
  UserCheck as UserCheckIcon,
  Calendar,
  Trophy,
  Siren,
  ShieldCheck,
  Bell,
  Send,
  CalendarDays,
  Flame,
  Award,
  ChevronRight,
  Settings,
  Sun,
  Moon,
  Type,
  User,
  Brain,
  Medal,
  Users as PlayerIcon,
  RotateCcw,
  Loader2
} from 'lucide-react';

export type Role = '일반회원' | '운영자' | '탈퇴회원';
export type GameStatus = '대여가능' | '대여중' | '대여불가';
export type RentalStatus = '대여중' | '반납완료';

export interface UserData {
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
  releaseYear: number;
  bggRating: number;
  rentalCount?: number;
  recentRentalCount?: number;
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

export interface Notice {
  noticeId: number;
  title: string;
  content: string;
  createdAt: string;
}

export interface ReportData {
  reportId: number;
  userId: string;
  category: string;
  title: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}

const PRESET_GENRES = ['전략게임', '파티게임', '추상전략', '타일 놓기', '카드게임', '가족게임', '협동게임', '마피아'];
const LOGIN_LOGO_URL = '/logo.png'; 
const ALLOWED_EMAIL_DOMAINS = [
  'kakaocorp.com',
  'kakaoenterprise.com',
  'kakaomobility.com',
  'kakaopaycorp.com',
  'kakaoent.com',
];

const currentYear = new Date().getFullYear();

// BGG 커스텀 아이콘 Component
const BggIcon = ({ size = 12, className = "" }: { size?: number; className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 32" 
    fill="currentColor" 
    className={`inline-block flex-shrink-0 ${className}`}
  >
    <path d="M 12 0 L 22 6 L 20 18 L 12 22 L 4 18 L 2 6 Z" />
    <path d="M 4 20 L 12 24 L 20 20 L 18 32 L 12 28 L 6 32 Z" />
  </svg>
);

const getDaysDifference = (dateStr1: string, dateStr2: string) => {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  const diffTime = d1.getTime() - d2.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

export default function App() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [notices, setNoticeList] = useState<Notice[]>([]);
  const [reports, setReportList] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);

  // 설정 관련 State (LocalStorage 연동)
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('kakao_bg_theme') as 'light' | 'dark') || 'light';
  });
  const [fontSize, setFontSize] = useState<'normal' | 'large'>(() => {
    return (localStorage.getItem('kakao_bg_fontSize') as 'normal' | 'large') || 'normal';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 관리자용 신고/건의 우측 드로어 State
  const [isAdminReportDrawerOpen, setIsAdminReportDrawerOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);

  // 내 정보 수정 / 비밀번호 변경 모달 State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [changePassword, setNewPasswordInput] = useState('');
  const [changePasswordConfirm, setNewPasswordConfirmInput] = useState('');

  // 신고 및 건의하기 팝업(모달) State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // 공지사항 롤링 State
  const [noticeIndex, setNoticeIndex] = useState(0);
  const [isNoticeTransition, setIsNoticeTransition] = useState(true);

  // 공지사항 우측 드로어 State
  const [isNoticeDrawerOpen, setIsNoticeDrawerOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  const [currentUser, setCurrentUser] = useState<UserData | null>(() => {
    const savedUser = localStorage.getItem('kakao_boardgame_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgotPassword' | 'updatePassword'>('login');
  
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [signupForm, setSignupForm] = useState({
    userId: '',
    name: '',
    emailPrefix: '',
    emailDomain: ALLOWED_EMAIL_DOMAINS[0],
    password: '',
    passwordConfirm: '',
  });
  const [isEmailChecked, setIsEmailChecked] = useState(false);

  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [cart, setCart] = useState<Game[]>([]);
  const [rentalDays, setRentalDays] = useState<number>(7);
  
  const [activeTab, setActiveTab] = useState<'games' | 'returns' | 'ranking' | 'admin'>('games');
  const [rankingTab, setRankingTab] = useState<'hot' | 'hall'>('hot');

  const [adminSubTab, setAdminSubTab] = useState<'gameAdmin' | 'rentalAdmin' | 'userAdmin' | 'noticeAdmin'>('gameAdmin');
  const [adminRentalTab, setAdminRentalTab] = useState<'active' | 'completed'>('active');

  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [customGenreInput, setCustomGenreInput] = useState('');

  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<{ id?: number; title: string; content: string }>({ title: '', content: '' });

  const [reportForm, setReportForm] = useState({ 
    title: '', 
    content: '', 
    category: '장애/오류 신고' 
  });

  const [gameListSearch, setGameListSearch] = useState('');
  const [gameAdminSearch, setGameAdminSearch] = useState('');
  const [userAdminSearch, setUserAdminSearch] = useState('');

  const mainScrollRef = useRef<HTMLDivElement | null>(null);
  const tabScrollPositions = useRef<{ [key: string]: number }>({
    games: 0,
    returns: 0,
    ranking: 0,
    admin: 0
  });

  const today = new Date().toISOString().split('T')[0];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  useEffect(() => {
    fetchInitialData();

    supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('updatePassword');
      }
    });
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchInitialData();
    }
  }, [activeTab, adminSubTab]);

  useEffect(() => {
    localStorage.setItem('kakao_bg_theme', themeMode);
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem('kakao_bg_fontSize', fontSize);
  }, [fontSize]);

  const handleTabChange = (newTab: 'games' | 'returns' | 'ranking' | 'admin') => {
    if (mainScrollRef.current) {
      tabScrollPositions.current[activeTab] = mainScrollRef.current.scrollTop;
    }
    setActiveTab(newTab);
    setTimeout(() => {
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTop = tabScrollPositions.current[newTab] || 0;
      }
    }, 0);
  };

  const recentNoticesList = notices.slice(0, 5);

  useEffect(() => {
    if (recentNoticesList.length <= 1) return;

    const interval = setInterval(() => {
      setIsNoticeTransition(true);
      setNoticeIndex((prev) => prev + 1);
    }, 4000);

    return () => clearInterval(interval);
  }, [recentNoticesList.length]);

  useEffect(() => {
    if (recentNoticesList.length <= 1) return;

    if (noticeIndex === recentNoticesList.length) {
      const timer = setTimeout(() => {
        setIsNoticeTransition(false);
        setNoticeIndex(0);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [noticeIndex, recentNoticesList.length]);

  const fetchInitialData = async () => {
    try {
      const { data: usersData } = await supabase.from('users').select('*');
      if (usersData) {
        const mappedUsers: UserData[] = await Promise.all(
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

      const { data: rentalsData } = await supabase.from('rentals').select('*');
      let rentalList: Rental[] = [];
      if (rentalsData) {
        rentalList = rentalsData.map(r => ({
          rentalId: r.rental_id,
          userId: r.user_id,
          gameId: r.game_id,
          gameTitle: r.game_title,
          status: r.status,
          startDate: r.start_date,
          endDate: r.end_date,
          returnedAt: r.returned_at
        }));
        setRentals(rentalList);
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

          const gameRentalList = rentalList.filter(r => r.gameId === g.game_id);
          const totalRentalCount = gameRentalList.length;
          const recentRentalCount = gameRentalList.filter(r => r.startDate >= thirtyDaysAgoStr).length;

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
            createdAt: g.created_at || new Date().toISOString(),
            releaseYear: Number(g.release_year) || currentYear,
            bggRating: Number(g.bgg_rating) || 7.0,
            rentalCount: totalRentalCount,
            recentRentalCount: recentRentalCount
          };
        }));
      }

      const { data: noticeData } = await supabase.from('notices').select('*').order('created_at', { ascending: false });
      if (noticeData) {
        setNoticeList(noticeData.map(n => ({
          noticeId: n.notice_id,
          title: n.title,
          content: n.content,
          createdAt: n.created_at?.split('T')[0] || today
        })));
      }

      // ⭕ DB의 is_read 컬럼값을 isRead로 매핑하여 불러옴
      const { data: reportsData } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
      if (reportsData) {
        setReportList(reportsData.map(r => ({
          reportId: r.report_id || r.id,
          userId: r.user_id,
          category: r.category || '신고/건의',
          title: r.title,
          content: r.content,
          createdAt: r.created_at?.replace('T', ' ').substring(0, 16) || today,
          isRead: !!r.is_read // boolean 타입 보장
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

    const loggedInUser: UserData = { 
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
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      alert('비밀번호 변경 실패: ' + error.message);
    } else {
      alert('비밀번호가 성공적으로 변경되었습니다. 변경된 비밀번호로 로그인해 주세요.');
      setAuthMode('login');
      setNewPassword('');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (changePassword || changePasswordConfirm) {
      if (changePassword !== changePasswordConfirm) {
        alert('신규 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
        return;
      }
    }

    const updates: { name: string; password_hash?: string } = {
      name: editName.trim()
    };

    if (changePassword) {
      updates.password_hash = changePassword;
    }

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('user_id', currentUser.userId);

    if (error) {
      alert('정보 수정 실패: ' + error.message);
    } else {
      alert('회원 정보가 성공적으로 변경되었습니다.');
      setIsEditProfileOpen(false);
      setNewPasswordInput('');
      setNewPasswordConfirmInput('');
      await fetchInitialData();
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('kakao_boardgame_user');
    setCart([]);
    setIsCartOpen(false);
    setIsSettingsOpen(false);
    setIsAdminReportDrawerOpen(false);
  };

  const handleUserRoleChange = async (targetUser: UserData, newRole: Role) => {
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

  // ⭕ 읽음 상태 DB 처리 및 로컬 state 동기화
  const handleMarkReportAsRead = async (report: ReportData) => {
    setSelectedReport(report);
    if (!report.isRead) {
      // 로컬 state 즉시 업데이트
      setReportList(prev => prev.map(r => r.reportId === report.reportId ? { ...r, isRead: true } : r));
      // DB 스네이크 케이스 is_read 컬럼 업데이트
      await supabase.from('reports').update({ is_read: true }).eq('report_id', report.reportId);
    }
  };

  // ⭕ 모두 읽음 일괄 처리
  const handleMarkAllReportsAsRead = async () => {
    const unreadIds = reports.filter(r => !r.isRead).map(r => r.reportId);
    if (unreadIds.length === 0) return;

    setReportList(prev => prev.map(r => ({ ...r, isRead: true })));
    await supabase.from('reports').update({ is_read: true }).in('report_id', unreadIds);
  };

  const activeRentalsCount = currentUser 
    ? rentals.filter((r) => r.userId === currentUser.userId && r.status === '대여중').length 
    : 0;

  const isAdmin = currentUser?.role === '운영자';
  const unreadReportsCount = reports.filter(r => !r.isRead).length;

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
    endDate.setDate(endDate.getDate() + rentalDays);
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

    alert(`보드게임 ${cart.length}건이 ${rentalDays}일간 대여되었습니다. (~${endDateStr} 반납)`);
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
      penaltyEnd.setDate(penaltyEnd.getDate() + newPoints - 1);
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
      penaltyEnd.setDate(penaltyEnd.getDate() + totalOverdueDays - 1);
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
    const formattedDifficulty = Number(Number(editingGame.difficulty).toFixed(2));

    if (isEditingMode) {
      const { error } = await supabase.from('games').update({
        title: editingGame.title,
        min_players: editingGame.minPlayers,
        max_players: editingGame.maxPlayers,
        play_time: editingGame.playTime,
        difficulty: formattedDifficulty,
        is_visible: editingGame.isVisible,
        image_url: editingGame.imageUrl,
        genres: genresPayload,
        release_year: editingGame.releaseYear,
        bgg_rating: editingGame.bggRating
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
        difficulty: formattedDifficulty,
        description: '',
        is_visible: editingGame.isVisible,
        image_url: editingGame.imageUrl,
        genres: genresPayload,
        release_year: editingGame.releaseYear,
        bgg_rating: editingGame.bggRating
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

  const saveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotice.title.trim() || !editingNotice.content.trim()) {
      alert('제목과 내용을 모두 입력해 주세요.');
      return;
    }

    if (editingNotice.id) {
      const { error } = await supabase.from('notices').update({
        title: editingNotice.title,
        content: editingNotice.content
      }).eq('notice_id', editingNotice.id);

      if (error) alert('공지사항 수정 실패: ' + error.message);
      else alert('공지사항이 수정되었습니다.');
    } else {
      const { error } = await supabase.from('notices').insert([{
        title: editingNotice.title,
        content: editingNotice.content
      }]);

      if (error) alert('공지사항 등록 실패: ' + error.message);
      else alert('공지사항이 등록되었습니다.');
    }

    await fetchInitialData();
    setIsNoticeModalOpen(false);
  };

  const deleteNotice = async (id: number) => {
    if (window.confirm('해당 공지사항을 삭제하시겠습니까?')) {
      const { error } = await supabase.from('notices').delete().eq('notice_id', id);
      if (error) alert('삭제 실패: ' + error.message);
      else alert('공지사항이 삭제되었습니다.');
      await fetchInitialData();
    }
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!reportForm.title.trim() || !reportForm.content.trim()) {
      alert('제목과 상세 내용을 입력해 주세요.');
      return;
    }

    const { error } = await supabase.from('reports').insert([
      {
        user_id: currentUser.userId,
        category: reportForm.category,
        title: reportForm.title.trim(),
        content: reportForm.content.trim(),
        is_read: false
      }
    ]);

    if (error) {
      alert('신고/건의 접수 실패: ' + error.message);
    } else {
      alert('운영진에게 성공적으로 전달되었습니다.\n감사합니다.');
      setReportForm({ title: '', content: '', category: '장애/오류 신고' });
      setIsReportModalOpen(false);
      await fetchInitialData();
    }
  };

  const handleNoticeClick = (notice: Notice) => {
    setSelectedNotice(notice);
    setIsNoticeDrawerOpen(true);
  };

  const getReleaseBonus = (year: number) => {
    const diff = currentYear - year;
    if (diff === 0) return 3;
    if (diff === 1) return 2;
    if (diff === 2) return 1;
    return 0;
  };

  const hotRankedGamesList = [...games]
    .map(game => {
      const recentScore = (game.recentRentalCount || 0) * 0.5;
      const releaseBonus = getReleaseBonus(game.releaseYear);
      const totalScore = Number((recentScore + releaseBonus + game.bggRating).toFixed(2));
      return { ...game, totalScore, recentScore, releaseBonus };
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 30);

  const hallOfFameRankedGamesList = [...games]
    .map(game => {
      const rentalScore = (game.rentalCount || 0) * 0.1;
      const totalScore = Number((rentalScore + game.bggRating).toFixed(2));
      return { ...game, totalScore, rentalScore };
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 30);

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

  const allReturnedRentalsAdminList = rentals
    .filter((r) => r.status === '반납완료')
    .sort((a, b) => {
      const dateA = a.returnedAt || a.startDate;
      const dateB = b.returnedAt || b.startDate;
      if (dateB !== dateA) {
        return dateB.localeCompare(dateA);
      }
      return b.rentalId - a.rentalId;
    });

  const calculatedCalculatedEndDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + rentalDays);
    return d.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="relative w-16 h-20 mb-6 flex items-center justify-center">
          <div className="absolute w-12 h-16 bg-[#FEE500] rounded-xl border-2 border-amber-300 shadow-lg animate-[ping_1.8s_cubic-bezier(0,0,0.2,1)_infinite] opacity-30"></div>
          <div className="absolute w-12 h-16 bg-sky-400 rounded-xl border-2 border-sky-300 shadow-md animate-bounce -translate-x-3 -rotate-12"></div>
          <div className="absolute w-12 h-16 bg-rose-500 rounded-xl border-2 border-rose-300 shadow-md animate-bounce delay-150 translate-x-3 rotate-12"></div>
          <div className="absolute w-12 h-16 bg-[#FEE500] rounded-xl border-2 border-amber-300 shadow-xl flex items-center justify-center text-slate-900 font-extrabold text-sm z-10">
            <Loader2 size={22} className="animate-spin text-slate-900" />
          </div>
        </div>

        <p className="text-slate-300 text-xs font-bold tracking-tight animate-pulse flex items-center gap-1.5">
          <span>데이터베이스 연결 중...</span>
        </p>
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
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200/80 -mt-12">
          
          <div className="bg-[#FEE500] px-6 py-8 text-center border-b border-amber-300/40 flex items-center justify-center">
            <img 
              src={LOGIN_LOGO_URL} 
              alt="KAKAO BOARD GAMES" 
              className="h-48 w-auto object-contain drop-shadow-sm" 
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
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
            {authMode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-900 font-bold mb-1.5 text-left">
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
                    <label className="block text-slate-900 font-bold text-left">
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

            {authMode === 'signup' && (
              <form onSubmit={handleFinalSignup} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-900 font-bold mb-1 text-left">
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
                  <label className="block text-slate-900 font-bold mb-1 text-left">
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
                  <label className="block text-slate-900 font-bold mb-1 text-left">
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

                <div>
                  <label className="block text-slate-900 font-bold mb-1 text-left">비밀번호</label>
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
                  <label className="block text-slate-900 font-bold mb-1 text-left">비밀번호 확인</label>
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

            {authMode === 'forgotPassword' && (
              <form onSubmit={handleForgotPassword} className="space-y-4 text-xs">
                <div className="text-center space-y-1 mb-2">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center justify-center gap-1.5">
                    <Mail size={16} /> 비밀번호 찾기
                  </h3>
                </div>

                <div>
                  <label className="block text-slate-900 font-bold mb-1.5 text-left">가입 이메일 주소</label>
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

            {authMode === 'updatePassword' && (
              <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs">
                <div className="text-center space-y-1 mb-2">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center justify-center gap-1.5">
                    <KeyRound size={16} /> 신규 비밀번호 설정
                  </h3>
                </div>

                <div>
                  <label className="block text-slate-900 font-bold mb-1.5 text-left">새 비밀번호</label>
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
  const isHeaderAdminTheme = activeTab === 'admin';
  const isDarkMode = themeMode === 'dark';
  const isLargeFont = fontSize === 'large';

  return (
    <div className={`min-h-screen flex justify-center transition-colors ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#FEE500]'}`}>
      <div className={`w-full max-w-md min-h-screen flex flex-col relative border-x transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/60'}`}>
        
        {/* 고정 상단 헤더 */}
        <header 
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }} 
          className={`fixed top-0 left-0 right-0 max-w-md mx-auto px-4 pb-2.5 z-30 shadow-sm flex justify-between items-center transition-colors ${
            isHeaderAdminTheme ? 'bg-sky-400 border-b border-sky-500/40 text-slate-900' : 'bg-[#FEE500] border-b border-amber-300/40 text-slate-900'
          }`}
        >
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <img 
                src="/header_logo.png" 
                alt="kakao board games" 
                className="h-9 w-auto object-contain drop-shadow-sm"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-900">
              <div className="flex items-center gap-1">
                <UserCheck size={14} className="text-slate-900" />
                <span>{currentUser.userId}</span>
              </div>

              {currentUser.penaltyEndDate && currentUser.penaltyEndDate >= today && (
                <div className="flex items-center gap-1">
                  <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-0.5 font-extrabold shadow-sm">
                    <AlertCircle size={10} /> 패널티 {currentUser.penaltyPoints}점
                  </span>
                  <span className="text-[10px] text-rose-700 font-extrabold bg-rose-100 px-1.5 py-0.5 rounded-md border border-rose-200">
                    (~{currentUser.penaltyEndDate} 대여불가)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 관리자 페이지 진입 시 신고 아이콘으로 변경 & 신규 글 있을 경우 N 뱃지 표시 */}
          {isHeaderAdminTheme ? (
            <button
              onClick={() => setIsAdminReportDrawerOpen(true)}
              title="신고/건의 확인"
              className="p-2 rounded-xl font-bold transition flex items-center justify-center shadow-sm bg-sky-300 hover:bg-sky-200 text-slate-900 relative"
            >
              <Siren size={18} />
              {unreadReportsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-extrabold w-4 h-4 rounded-full flex items-center justify-center text-[9px] border-2 border-sky-400 shadow-sm animate-pulse">
                  N
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={() => setIsSettingsOpen(true)}
              title="설정"
              className="p-2 rounded-xl font-bold transition flex items-center justify-center shadow-sm bg-amber-400/80 hover:bg-amber-400 text-slate-900"
            >
              <Settings size={18} />
            </button>
          )}
        </header>

        {/* 메인 스크롤 영역 */}
        <main 
          ref={mainScrollRef}
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 92px)' }} 
          className={`flex-1 p-4 pb-28 overflow-y-auto transition-colors ${isDarkMode ? 'bg-slate-900' : 'bg-white'} ${isLargeFont ? 'text-sm' : 'text-xs'}`}
        >
          {/* 1. 게임목록(대여) 탭 */}
          {activeTab === 'games' && (
            <div className="space-y-4 mt-0.5">
              
              {/* 수직 롤링 공지사항 배너 */}
              <div 
                onClick={() => {
                  if (recentNoticesList.length > 0) {
                    const activeIndex = noticeIndex % recentNoticesList.length;
                    handleNoticeClick(recentNoticesList[activeIndex]);
                  }
                }}
                className={`px-3.5 py-3 rounded-2xl flex items-center gap-2.5 shadow-sm overflow-hidden h-11 cursor-pointer transition active:scale-[0.99] ${
                  isDarkMode ? 'bg-slate-800 border-2 border-slate-700 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                <Bell size={16} className="text-[#FEE500] flex-shrink-0 z-10" />
                <div className="flex-1 h-5 overflow-hidden relative">
                  {recentNoticesList.length > 0 ? (
                    <div 
                      className={`flex flex-col ${isNoticeTransition ? 'transition-transform duration-500 ease-in-out' : ''}`}
                      style={{ transform: `translateY(-${noticeIndex * 20}px)` }}
                    >
                      {[...recentNoticesList, recentNoticesList[0]].map((notice, idx) => (
                        <div key={`${notice.noticeId}-${idx}`} className="h-5 flex items-center justify-between">
                          <span className="text-[#FEE500] font-extrabold truncate">
                            {notice.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-5 flex items-center">
                      <span className="text-slate-300">
                        1인당 최대 <strong className="text-[#FEE500] font-bold">3개</strong>까지 대여하실 수 있습니다.
                      </span>
                    </div>
                  )}
                </div>
                {recentNoticesList.length > 0 && (
                  <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
                )}
              </div>

              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="게임명 검색..."
                  value={gameListSearch}
                  onChange={(e) => setGameListSearch(e.target.value)}
                  className={`w-full border pl-10 pr-9 py-2.5 rounded-xl focus:outline-none transition ${
                    isDarkMode 
                      ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-slate-500' 
                      : 'bg-slate-50/50 border-slate-200 text-slate-900 focus:border-slate-800'
                  }`}
                />
                {gameListSearch && (
                  <button onClick={() => setGameListSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="grid gap-3">
                {filteredGameList.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-300/40 text-slate-400 rounded-2xl">
                    '{gameListSearch}' 검색 결과가 없습니다.
                  </div>
                ) : (
                  filteredGameList.map((game) => {
                    const isAvailable = game.status === '대여가능';
                    const isSelectedInCart = cart.some((item) => item.gameId === game.gameId);
                    const activeRental = rentals.find((r) => r.gameId === game.gameId && r.status === '대여중');
                    const isOverdue = activeRental ? today > activeRental.endDate : false;
                    const overdueDays = (activeRental && isOverdue) ? getDaysDifference(today, activeRental.endDate) : 0;

                    return (
                      <div key={game.gameId} className={`border rounded-2xl p-3.5 flex gap-3.5 shadow-sm transition ${
                        isDarkMode ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200/80 hover:border-slate-300'
                      }`}>
                        <img 
                          src={game.imageUrl} 
                          alt={game.title} 
                          className="w-20 h-20 object-cover rounded-xl bg-slate-100 flex-shrink-0 border border-slate-200/40"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=300'; }}
                        />
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start">
                              <h3 className={`font-bold truncate ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                <span>{game.title}</span>
                                <span className="text-[11px] text-slate-400 font-mono font-normal ml-1">({game.releaseYear}년)</span>
                              </h3>
                              <span className="text-[10px] text-slate-400 font-mono flex-shrink-0 ml-1">{game.gameId}</span>
                            </div>
                            
                            <div className={`flex flex-wrap gap-2 font-semibold mt-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                              <span className="flex items-center gap-0.5"><PlayerIcon size={11} className="text-slate-400" /> {game.minPlayers}-{game.maxPlayers}인</span>
                              <span className="flex items-center gap-0.5"><Clock size={11} className="text-slate-400" /> {game.playTime}분</span>
                              <span className="flex items-center gap-0.5 font-mono"><Brain size={11} className="text-slate-400" /> {Number(game.difficulty).toFixed(2)}</span>
                              <span className="flex items-center gap-0.5"><BggIcon size={11} className="text-slate-400" /> BGG {game.bggRating}</span>
                            </div>
                          </div>

                          <div className={`mt-3 pt-2.5 border-t space-y-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
                              {game.genres.map((genre) => (
                                <span key={genre} className={`px-2 py-0.5 rounded-md font-bold whitespace-nowrap text-[10px] flex-shrink-0 ${
                                  isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-800'
                                }`}>
                                  {genre}
                                </span>
                              ))}
                            </div>

                            <div className="flex justify-end">
                              {isAvailable ? (
                                <button
                                  onClick={() => toggleCartItem(game)}
                                  className={`w-auto px-3.5 py-1.5 rounded-xl font-bold flex items-center justify-center gap-1 transition text-xs ${
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
                                    <span className="px-2.5 py-1 rounded-xl font-extrabold bg-rose-100 text-rose-700 border border-rose-200 inline-block text-xs">
                                      대여중 (연체 {overdueDays}일)
                                    </span>
                                  ) : (
                                    <span className={`px-2.5 py-1 rounded-xl font-bold border inline-block text-xs ${
                                      isDarkMode ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}>
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

          {/* 2. 반납/히스토리 탭 */}
          {activeTab === 'returns' && (
            <div className="space-y-5 mt-0.5">
              <div className={`p-4 rounded-2xl flex justify-between items-center shadow-sm ${
                isDarkMode ? 'bg-slate-800 border-2 border-slate-700 text-white' : 'bg-slate-900 text-white'
              }`}>
                <div className="flex items-center justify-between w-full">
                  <span className="text-slate-300 font-medium">현재 대여 중인 게임</span>
                  <span className="text-lg font-black text-[#FEE500]">{activeRentalsCount} / 3 개</span>
                </div>
                {activeRentalsCount > 0 && (
                  <button
                    onClick={returnAllGames}
                    className="bg-[#FEE500] text-slate-900 font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 hover:bg-amber-400 transition ml-3 flex-shrink-0"
                  >
                    <RotateCcw size={14} /> 일괄 반납
                  </button>
                )}
              </div>

              <section className="space-y-2.5">
                <h3 className={`font-extrabold tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                  <span className="w-1.5 h-3.5 bg-slate-900 rounded-full inline-block"></span>
                  대여중인 게임
                </h3>
                {rentals.filter((r) => r.userId === currentUser.userId && r.status === '대여중').length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-300/40 text-slate-400 rounded-2xl">대여 중인 보드게임이 없습니다.</div>
                ) : (
                  rentals.filter((r) => r.userId === currentUser.userId && r.status === '대여중').map((rental) => {
                    const isOverdue = today > rental.endDate;
                    const overdueDays = isOverdue ? getDaysDifference(today, rental.endDate) : 0;

                    return (
                      <div key={rental.rentalId} className={`border p-3.5 rounded-2xl flex justify-between items-center ${
                        isOverdue 
                          ? 'border-rose-300 bg-rose-50/40' 
                          : isDarkMode 
                          ? 'border-slate-700 bg-slate-800' 
                          : 'border-amber-300/60 bg-amber-50/40'
                      }`}>
                        <div>
                          <h4 className={`font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                            <span>{rental.gameTitle}</span>
                            <span className="text-slate-400 font-mono font-normal">({rental.gameId})</span>
                          </h4>
                          <div className={`mt-1 space-y-0.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            <div>대여일: {rental.startDate}</div>
                            <div>
                              반납예정일:{' '}
                              {isOverdue ? (
                                <strong className="text-rose-600 font-extrabold">
                                  {rental.endDate} (연체 {overdueDays}일)
                                </strong>
                              ) : (
                                <strong className={isDarkMode ? 'text-slate-100 font-bold' : 'text-slate-900 font-bold'}>
                                  {rental.endDate}
                                </strong>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => returnGame(rental.rentalId, rental.gameId)}
                          className="bg-slate-900 text-white font-bold px-3 py-1.5 rounded-xl hover:bg-slate-800 transition"
                        >
                          반납
                        </button>
                      </div>
                    );
                  })
                )}
              </section>

              <section className="space-y-2.5">
                <h3 className={`font-extrabold tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                  <span className="w-1.5 h-3.5 bg-slate-400 rounded-full inline-block"></span>
                  대여 및 반납 이력
                </h3>
                {returnedRentalsList.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-300/40 text-slate-400 rounded-2xl">반납 이력이 없습니다.</div>
                ) : (
                  returnedRentalsList.map((rental) => {
                    const returnedDate = rental.returnedAt?.split('T')[0] || rental.startDate;
                    const isLateReturn = returnedDate > rental.endDate;
                    const overdueDays = isLateReturn ? getDaysDifference(returnedDate, rental.endDate) : 0;

                    return (
                      <div key={rental.rentalId} className={`border p-3.5 rounded-2xl flex justify-between items-center ${
                        isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200/80'
                      }`}>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
                            <h4 className={`font-bold flex items-center gap-1 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                              <span>{rental.gameTitle}</span>
                              <span className="text-slate-400 font-mono font-normal">({rental.gameId})</span>
                            </h4>
                          </div>
                          <p className="text-slate-500 mt-1">
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

          {/* 3. 랭킹 탭 */}
          {activeTab === 'ranking' && (
            <div className="space-y-4 mt-0.5">
              <div className={`pb-2 border-b flex justify-between items-end ${isDarkMode ? 'border-slate-800' : 'border-slate-200/80'}`}>
                <div>
                  <h2 className={`font-black tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    <Trophy size={18} className="text-amber-500 fill-amber-400" />
                    보드게임 랭킹 Top 30
                  </h2>
                </div>
              </div>

              <div className={`flex p-1 rounded-xl font-bold ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <button
                  onClick={() => setRankingTab('hot')}
                  className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                    rankingTab === 'hot' 
                      ? isDarkMode ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Flame size={14} className="text-rose-500 fill-rose-500" /> 요즘 핫한 게임
                </button>
                <button
                  onClick={() => setRankingTab('hall')}
                  className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                    rankingTab === 'hall' 
                      ? isDarkMode ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Award size={14} className="text-amber-500" /> 명예의 전당
                </button>
              </div>

              {rankingTab === 'hot' && (
                <div className="space-y-2.5">
                  <p className="text-slate-400 font-medium px-1">
                    * 최근 30일 대여 횟수 + 신작 가산점 + BGG 평점 기준
                  </p>
                  {hotRankedGamesList.map((game, index) => {
                    const rank = index + 1;
                    return (
                      <div key={game.gameId} className={`border p-3.5 rounded-2xl flex items-center gap-3.5 shadow-sm ${
                        isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200/80'
                      }`}>
                        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 relative">
                          {rank === 1 ? (
                            <div className="relative flex items-center justify-center">
                              <Medal size={32} className="text-amber-400 fill-amber-300" />
                              <span className="absolute top-[9px] font-black text-[11px] text-amber-950">{rank}</span>
                            </div>
                          ) : rank === 2 ? (
                            <div className="relative flex items-center justify-center">
                              <Medal size={32} className="text-slate-300 fill-slate-200" />
                              <span className="absolute top-[9px] font-black text-[11px] text-slate-800">{rank}</span>
                            </div>
                          ) : rank === 3 ? (
                            <div className="relative flex items-center justify-center">
                              <Medal size={32} className="text-amber-700 fill-amber-600" />
                              <span className="absolute top-[9px] font-black text-[11px] text-white">{rank}</span>
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center bg-slate-100 text-slate-600">
                              {rank}
                            </div>
                          )}
                        </div>

                        <img 
                          src={game.imageUrl} 
                          alt={game.title} 
                          className="w-14 h-14 object-cover rounded-xl bg-slate-100 border border-slate-200/40 flex-shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=300'; }}
                        />

                        <div className="flex-1 min-w-0">
                          <h3 className={`font-bold truncate ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{game.title}</h3>
                          <div className="text-slate-400 mt-1 space-y-0.5">
                            <div className="flex gap-2">
                              <span>최근 30일 대여: <strong className="text-rose-500">{game.recentRentalCount || 0}회</strong></span>
                              <span>출시: {game.releaseYear}년 (+{game.releaseBonus}점)</span>
                            </div>
                            <div>BGG 평점: {game.bggRating}점</div>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span className="text-slate-400 font-medium block">트렌드점수</span>
                          <span className="font-black text-rose-500 text-sm">{game.totalScore}점</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {rankingTab === 'hall' && (
                <div className="space-y-2.5">
                  <p className="text-slate-400 font-medium px-1">
                    * 전체 누적 대여 횟수 + BGG 평점 기준 (스테디셀러)
                  </p>
                  {hallOfFameRankedGamesList.map((game, index) => {
                    const rank = index + 1;
                    return (
                      <div key={game.gameId} className={`border p-3.5 rounded-2xl flex items-center gap-3.5 shadow-sm ${
                        isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200/80'
                      }`}>
                        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 relative">
                          {rank === 1 ? (
                            <div className="relative flex items-center justify-center">
                              <Medal size={32} className="text-amber-400 fill-amber-300" />
                              <span className="absolute top-[9px] font-black text-[11px] text-amber-950">{rank}</span>
                            </div>
                          ) : rank === 2 ? (
                            <div className="relative flex items-center justify-center">
                              <Medal size={32} className="text-slate-300 fill-slate-200" />
                              <span className="absolute top-[9px] font-black text-[11px] text-slate-800">{rank}</span>
                            </div>
                          ) : rank === 3 ? (
                            <div className="relative flex items-center justify-center">
                              <Medal size={32} className="text-amber-700 fill-amber-600" />
                              <span className="absolute top-[9px] font-black text-[11px] text-white">{rank}</span>
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center bg-slate-100 text-slate-600">
                              {rank}
                            </div>
                          )}
                        </div>

                        <img 
                          src={game.imageUrl} 
                          alt={game.title} 
                          className="w-14 h-14 object-cover rounded-xl bg-slate-100 border border-slate-200/40 flex-shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=300'; }}
                        />

                        <div className="flex-1 min-w-0">
                          <h3 className={`font-bold truncate ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{game.title}</h3>
                          <div className="text-slate-400 mt-1 space-y-0.5">
                            <div className="flex gap-2">
                              <span>총 누적 대여: <strong className="text-amber-500">{game.rentalCount || 0}회</strong></span>
                              <span>출시: {game.releaseYear}년</span>
                            </div>
                            <div>BGG 평점: {game.bggRating}점</div>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span className="text-slate-400 font-medium block">누적점수</span>
                          <span className={`font-black text-sm ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{game.totalScore}점</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 5. 관리자 통합 페이지 */}
          {activeTab === 'admin' && isAdmin && (
            <div className="space-y-4 mt-0.5">
              <div className={`grid grid-cols-4 gap-1 p-1 rounded-xl font-bold ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <button
                  onClick={() => setAdminSubTab('gameAdmin')}
                  className={`py-2 rounded-lg transition text-center ${adminSubTab === 'gameAdmin' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  게임관리
                </button>
                <button
                  onClick={() => setAdminSubTab('rentalAdmin')}
                  className={`py-2 rounded-lg transition text-center ${adminSubTab === 'rentalAdmin' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  대여/반납
                </button>
                <button
                  onClick={() => setAdminSubTab('userAdmin')}
                  className={`py-2 rounded-lg transition text-center ${adminSubTab === 'userAdmin' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  회원관리
                </button>
                <button
                  onClick={() => setAdminSubTab('noticeAdmin')}
                  className={`py-2 rounded-lg transition text-center ${adminSubTab === 'noticeAdmin' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  공지사항
                </button>
              </div>

              {adminSubTab === 'gameAdmin' && (
                <div className="space-y-4">
                  <div className={`flex justify-between items-center pb-2 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-200/80'}`}>
                    <div>
                      <h2 className={`font-black tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                        <span className="w-2 h-4 bg-sky-400 rounded-sm inline-block border border-sky-500"></span>
                        게임 등록 및 수정
                      </h2>
                      <p className="text-slate-400 font-medium mt-0.5">
                        보드게임을 추가하거나 수정 및 삭제합니다.
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
                          createdAt: new Date().toISOString(),
                          releaseYear: currentYear,
                          bggRating: 7.0
                        });
                        setIsGameModalOpen(true);
                      }}
                      className="bg-slate-900 text-white font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 hover:bg-slate-800 transition shadow-sm"
                    >
                      <Plus size={14} /> 게임 등록
                    </button>
                  </div>

                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="관리할 게임명 검색..."
                      value={gameAdminSearch}
                      onChange={(e) => setGameAdminSearch(e.target.value)}
                      className={`w-full border pl-10 pr-9 py-2.5 rounded-xl focus:outline-none transition ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50/50 border-slate-200 text-slate-900'
                      }`}
                    />
                    {gameAdminSearch && (
                      <button onClick={() => setGameAdminSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {filteredGameAdminList.map((game) => (
                      <div key={game.gameId} className={`border p-3 rounded-2xl flex justify-between items-center shadow-sm ${
                        isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200/80'
                      }`}>
                        <div className="flex items-center gap-3">
                          <img 
                            src={game.imageUrl} 
                            alt={game.title} 
                            className="w-12 h-12 object-cover rounded-xl bg-slate-100 border border-slate-200/40" 
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=300'; }}
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className={`font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{game.title}</h3>
                              <span className="text-slate-400 font-mono">({game.gameId})</span>
                              {game.isVisible === 'Y' ? (
                                <span className="text-emerald-500 font-bold flex items-center gap-0.5"><Eye size={11} /> 노출</span>
                              ) : (
                                <span className="text-slate-400 font-bold flex items-center gap-0.5"><EyeOff size={11} /> 숨김</span>
                              )}
                            </div>
                            <p className="text-slate-400 mt-0.5">{game.releaseYear}년 | BGG {game.bggRating} | 난이도 {Number(game.difficulty).toFixed(2)}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setIsEditingMode(true);
                              setEditingGame(game);
                              setIsGameModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:bg-slate-700/50 rounded-xl transition"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={() => deleteGame(game.gameId, game.title, game.status)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50/10 rounded-xl transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {adminSubTab === 'rentalAdmin' && (
                <div className="space-y-4">
                  <div className={`pb-2 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-200/80'}`}>
                    <h2 className={`font-black tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                      <span className="w-2 h-4 bg-sky-400 rounded-sm inline-block border border-sky-500"></span>
                      대여 및 반납 현황
                    </h2>
                  </div>

                  <div className={`flex p-1 rounded-xl font-bold ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <button
                      onClick={() => setAdminRentalTab('active')}
                      className={`flex-1 py-2 rounded-lg transition ${
                        adminRentalTab === 'active' 
                          ? isDarkMode ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      대여중 ({rentals.filter((r) => r.status === '대여중').length})
                    </button>
                    <button
                      onClick={() => setAdminRentalTab('completed')}
                      className={`flex-1 py-2 rounded-lg transition ${
                        adminRentalTab === 'completed' 
                          ? isDarkMode ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      반납완료 ({allReturnedRentalsAdminList.length})
                    </button>
                  </div>

                  {adminRentalTab === 'active' && (
                    <div className="space-y-2.5">
                      {rentals.filter((r) => r.status === '대여중').map((rental) => {
                        const isOverdue = today > rental.endDate;
                        const overdueDays = isOverdue ? getDaysDifference(today, rental.endDate) : 0;

                        return (
                          <div key={rental.rentalId} className={`p-3.5 rounded-2xl border ${
                            isOverdue 
                              ? 'border-rose-300 bg-rose-50/50' 
                              : isDarkMode 
                              ? 'bg-slate-800/80 border-slate-700' 
                              : 'border-slate-200/80 bg-white shadow-sm'
                          }`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-slate-400 font-mono block">대여회원: {rental.userId}</span>
                                <h3 className={`font-bold mt-0.5 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{rental.gameTitle}</h3>
                              </div>
                              {isOverdue && (
                                <span className="bg-rose-600 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <AlertTriangle size={10} /> 연체 ({overdueDays}일)
                                </span>
                              )}
                            </div>
                            <div className={`mt-3 pt-2 border-t flex justify-between ${isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-100 text-slate-600'}`}>
                              <span>대여일: {rental.startDate}</span>
                              <span>반납예정일: <strong className={isOverdue ? 'text-rose-600 font-bold' : isDarkMode ? 'text-slate-100' : 'text-slate-900'}>{rental.endDate}</strong></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {adminRentalTab === 'completed' && (
                    <div className="space-y-2.5">
                      {allReturnedRentalsAdminList.map((rental) => {
                        const returnedDate = rental.returnedAt?.split('T')[0] || rental.startDate;

                        return (
                          <div key={rental.rentalId} className={`p-3.5 rounded-2xl border shadow-sm space-y-1.5 ${
                            isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200/80'
                          }`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-slate-400 font-mono block">대여회원: {rental.userId}</span>
                                <h3 className={`font-bold mt-0.5 flex items-center gap-1.5 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                  <CheckCircle2 size={13} className="text-emerald-500" />
                                  {rental.gameTitle}
                                </h3>
                              </div>
                            </div>
                            <div className={`mt-2 pt-2 border-t flex justify-between ${isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-100 text-slate-600'}`}>
                              <span>대여일: {rental.startDate}</span>
                              <span>반납일: <strong className="text-emerald-500 font-bold">{returnedDate}</strong></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {adminSubTab === 'userAdmin' && (
                <div className="space-y-4">
                  <div className={`pb-2 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-200/80'}`}>
                    <h2 className={`font-black tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                      <span className="w-2 h-4 bg-sky-400 rounded-sm inline-block border border-sky-500"></span>
                      회원 관리
                    </h2>
                  </div>

                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="회원명 또는 회원 ID 검색..."
                      value={userAdminSearch}
                      onChange={(e) => setUserAdminSearch(e.target.value)}
                      className={`w-full border pl-10 pr-9 py-2.5 rounded-xl focus:outline-none transition ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50/50 border-slate-200 text-slate-900'
                      }`}
                    />
                    {userAdminSearch && (
                      <button onClick={() => setUserAdminSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {filteredUserAdminList.map((user) => {
                      const isWithdrawn = user.role === '탈퇴회원';

                      return (
                        <div key={user.userId} className={`border p-3.5 rounded-2xl space-y-2 shadow-sm ${
                          isWithdrawn 
                            ? isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200' 
                            : isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200/80'
                        }`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h3 className={`font-bold font-mono ${isWithdrawn ? 'text-slate-400 line-through' : isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{user.userId}</h3>
                                <span className={`px-2 py-0.5 rounded-md font-semibold ${
                                  user.role === '운영자' ? 'bg-amber-100 text-amber-800' : isWithdrawn ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {user.role}
                                </span>
                              </div>
                              <p className="text-slate-400 mt-0.5">{user.name} | {user.email}</p>
                            </div>

                            {user.role === '일반회원' && (
                              <button
                                onClick={() => handleUserRoleChange(user, '탈퇴회원')}
                                className="px-2.5 py-1 font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition flex items-center gap-1"
                              >
                                <UserX size={12} /> 탈퇴
                              </button>
                            )}
                            {user.role === '탈퇴회원' && (
                              <button
                                onClick={() => handleUserRoleChange(user, '일반회원')}
                                className="px-2.5 py-1 font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition flex items-center gap-1"
                              >
                                <UserCheckIcon size={12} /> 복구
                              </button>
                            )}
                          </div>

                          <div className={`pt-2 border-t flex justify-between text-slate-400 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                            <span>가입일: {user.createdAt}</span>
                            <span className="font-semibold flex items-center gap-1">
                              <ShieldAlert size={13} className={user.penaltyPoints > 0 ? 'text-rose-600' : 'text-slate-400'} />
                              패널티: {user.penaltyPoints}점
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 공지사항 관리 페이지 */}
              {adminSubTab === 'noticeAdmin' && (
                <div className="space-y-4">
                  <div className={`flex justify-between items-center pb-2 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-200/80'}`}>
                    <div>
                      <h2 className={`font-black tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                        <span className="w-2 h-4 bg-sky-400 rounded-sm inline-block border border-sky-500"></span>
                        공지사항 관리
                      </h2>
                    </div>
                    <button
                      onClick={() => {
                        setEditingNotice({ title: '', content: '' });
                        setIsNoticeModalOpen(true);
                      }}
                      className="bg-slate-900 text-white font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 hover:bg-slate-800 transition shadow-sm"
                    >
                      <Plus size={14} /> 공지 작성
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {notices.map((n) => (
                      <div key={n.noticeId} className={`border p-3.5 rounded-2xl shadow-sm space-y-1.5 ${
                        isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200/80'
                      }`}>
                        <div className="flex justify-between items-start">
                          <h3 className={`font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{n.title}</h3>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingNotice({ id: n.noticeId, title: n.title, content: n.content });
                                setIsNoticeModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:bg-slate-700/50 rounded-lg transition"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => deleteNotice(n.noticeId)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50/10 rounded-lg transition"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                        <p className={`whitespace-pre-wrap ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{n.content}</p>
                        <span className="text-slate-400 block pt-1">{n.createdAt} 작성</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </main>

        {/* ⭕ 1. 장바구니 플로팅 버튼 테마별 차별화 (라이트: 검은색, 다크: 노란색) */}
        {activeTab === 'games' && (
          <div className="fixed bottom-20 max-w-md mx-auto right-4 pointer-events-none z-30">
            <button
              onClick={() => setIsCartOpen(true)}
              className={`pointer-events-auto relative p-3.5 rounded-full active:scale-95 transition-all shadow-xl flex items-center justify-center ${
                isDarkMode 
                  ? 'bg-[#FEE500] text-slate-900 border border-amber-300 hover:bg-amber-400' 
                  : 'bg-slate-900 text-white border border-slate-700 hover:bg-slate-800'
              }`}
              title="장바구니 열기"
            >
              <ShoppingCart size={20} className={isDarkMode ? 'text-slate-900' : 'text-white'} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-extrabold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm text-[10px]">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* 하단 네비게이션 아이콘 */}
        <nav className={`fixed bottom-0 left-0 right-0 max-w-md mx-auto border-t flex justify-around px-2 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] z-30 shadow-lg transition-colors ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <button onClick={() => handleTabChange('games')} className={`flex flex-col items-center font-bold text-[10px] ${activeTab === 'games' ? isDarkMode ? 'text-white' : 'text-slate-900' : 'text-slate-400'}`}>
            <Boxes size={20} />
            <span className="mt-1">대여</span>
          </button>
          <button onClick={() => handleTabChange('returns')} className={`flex flex-col items-center font-bold text-[10px] ${activeTab === 'returns' ? isDarkMode ? 'text-white' : 'text-slate-900' : 'text-slate-400'}`}>
            <PackageCheck size={20} />
            <span className="mt-1">반납</span>
          </button>
          <button onClick={() => handleTabChange('ranking')} className={`flex flex-col items-center font-bold text-[10px] ${activeTab === 'ranking' ? isDarkMode ? 'text-white' : 'text-slate-900' : 'text-slate-400'}`}>
            <Trophy size={20} />
            <span className="mt-1">랭킹</span>
          </button>
          {isAdmin && (
            <button onClick={() => handleTabChange('admin')} className={`flex flex-col items-center font-bold text-[10px] ${activeTab === 'admin' ? 'text-sky-500' : 'text-slate-400'}`}>
              <ShieldCheck size={20} />
              <span className="mt-1">관리자</span>
            </button>
          )}
        </nav>

        {/* 설정 드로어 (왼쪽 오버레이 클릭 닫기 적용) */}
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end" onClick={() => setIsSettingsOpen(false)}>
            <div 
              className={`w-full max-w-xs h-full flex flex-col shadow-2xl transition-colors ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'} ${isLargeFont ? 'text-sm' : 'text-xs'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`p-4 flex justify-between items-center font-bold text-sm ${
                isHeaderAdminTheme ? 'bg-sky-400 text-slate-900' : 'bg-[#FEE500] text-slate-900'
              }`}>
                <span className="flex items-center gap-2">
                  <Settings size={18} /> 설정
                </span>
                <button onClick={() => setIsSettingsOpen(false)}><X size={18} /></button>
              </div>

              <div className="flex-1 p-5 overflow-y-auto space-y-6">
                
                {/* A. 내 정보 수정 / 비밀번호 변경 */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={14} /> 계정 설정
                  </h4>
                  <button
                    onClick={() => {
                      if (currentUser) {
                        setEditName(currentUser.name);
                        setNewPasswordInput('');
                        setNewPasswordConfirmInput('');
                        setIsEditProfileOpen(true);
                      }
                    }}
                    className={`w-full p-3 rounded-xl border text-left font-bold flex justify-between items-center transition ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <span>내 정보 / 비밀번호 변경</span>
                    <ChevronRight size={16} className="text-slate-400" />
                  </button>
                </div>

                {/* B. 신고 및 건의하기 */}
                <div className="space-y-2.5 pt-2 border-t border-slate-200/20">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Siren size={14} /> 고객지원
                  </h4>
                  <button
                    onClick={() => {
                      setIsReportModalOpen(true);
                    }}
                    className={`w-full p-3 rounded-xl border text-left font-bold flex justify-between items-center transition ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Siren size={15} className="text-rose-500" /> 신고 및 건의하기
                    </span>
                    <ChevronRight size={16} className="text-slate-400" />
                  </button>
                </div>

                {/* C. 테마 선택 */}
                <div className="space-y-2.5 pt-2 border-t border-slate-200/20">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sun size={14} /> 테마 선택
                  </h4>
                  <div className={`flex p-1 rounded-xl font-bold ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <button
                      onClick={() => setThemeMode('light')}
                      className={`flex-1 py-2.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                        themeMode === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Sun size={14} className="text-amber-500" /> 라이트모드
                    </button>
                    <button
                      onClick={() => setThemeMode('dark')}
                      className={`flex-1 py-2.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                        themeMode === 'dark' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Moon size={14} className="text-indigo-400" /> 다크모드
                    </button>
                  </div>
                </div>

                {/* D. 본문 글자 크기 */}
                <div className="space-y-2.5 pt-2 border-t border-slate-200/20">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Type size={14} /> 본문 글자 크기
                  </h4>
                  <div className={`flex p-1 rounded-xl font-bold ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <button
                      onClick={() => setFontSize('normal')}
                      className={`flex-1 py-2.5 rounded-lg transition flex items-center justify-center ${
                        fontSize === 'normal' 
                          ? isDarkMode ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      보통 (기본)
                    </button>
                    <button
                      onClick={() => setFontSize('large')}
                      className={`flex-1 py-2.5 rounded-lg transition flex items-center justify-center ${
                        fontSize === 'large' 
                          ? isDarkMode ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      크게
                    </button>
                  </div>
                </div>

              </div>

              {/* 로그아웃 버튼 (최하단에 배치) */}
              <div className={`p-4 border-t ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                <button
                  onClick={handleLogout}
                  className="w-full bg-rose-600 text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-sm hover:bg-rose-700"
                >
                  <LogOut size={16} /> 로그아웃
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 관리자용 신고/건의 내역 우측 슬라이딩 Drawer 모달 */}
        {isAdminReportDrawerOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end" onClick={() => setIsAdminReportDrawerOpen(false)}>
            <div 
              className={`w-full max-w-xs h-full flex flex-col shadow-2xl transition-colors ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'} ${isLargeFont ? 'text-sm' : 'text-xs'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 bg-sky-400 text-slate-900 flex justify-between items-center font-bold text-sm">
                <span className="flex items-center gap-2">
                  <Siren size={18} /> 신고 및 건의 접수함
                </span>
                <button onClick={() => setIsAdminReportDrawerOpen(false)}><X size={18} /></button>
              </div>

              <div className="p-3 bg-slate-100 dark:bg-slate-800/80 flex justify-between items-center text-xs border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">
                  총 {reports.length}건 (안읽음: <strong className="text-rose-500 font-extrabold">{unreadReportsCount}</strong>건)
                </span>
                {unreadReportsCount > 0 && (
                  <button 
                    onClick={handleMarkAllReportsAsRead}
                    className="text-[10px] font-bold bg-slate-900 text-white px-2 py-1 rounded-md hover:bg-slate-800 transition"
                  >
                    모두 읽음
                  </button>
                )}
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {selectedReport && (
                  <div className={`p-4 rounded-2xl space-y-2 border shadow-sm ${
                    isDarkMode ? 'bg-slate-800 border-sky-500/40' : 'bg-sky-50 border-sky-300'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-sky-800 font-extrabold bg-sky-200 px-2 py-0.5 rounded-md inline-block">
                        {selectedReport.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        작성자: {selectedReport.userId}
                      </span>
                    </div>
                    <h3 className={`font-extrabold leading-snug ${isDarkMode ? 'text-sky-300' : 'text-slate-900'}`}>{selectedReport.title}</h3>
                    <p className={`whitespace-pre-wrap leading-relaxed pt-1.5 border-t ${
                      isDarkMode ? 'text-slate-300 border-slate-700' : 'text-slate-700 border-sky-200'
                    }`}>
                      {selectedReport.content}
                    </p>
                    <span className="text-[10px] text-slate-400 block text-right pt-0.5">{selectedReport.createdAt}</span>
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  <h4 className="font-bold text-slate-400 px-0.5">전체 접수 목록 ({reports.length})</h4>
                  {reports.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">접수된 신고/건의 내역이 없습니다.</div>
                  ) : (
                    reports.map((report) => {
                      const isSelected = selectedReport?.reportId === report.reportId;
                      return (
                        <div
                          key={report.reportId}
                          onClick={() => handleMarkReportAsRead(report)}
                          className={`p-3 rounded-xl border cursor-pointer transition relative ${
                            isSelected
                              ? 'border-sky-500 bg-sky-500 text-slate-900 font-bold shadow-sm'
                              : isDarkMode
                              ? 'border-slate-800 bg-slate-800/60 text-slate-200 hover:border-slate-700'
                              : 'border-slate-200/80 bg-white text-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              {!report.isRead && (
                                <span className="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0 animate-pulse">
                                  N
                                </span>
                              )}
                              <span className="truncate font-semibold">{report.title}</span>
                            </div>
                            <span className={`text-[10px] font-mono flex-shrink-0 ${isSelected ? 'text-slate-900' : 'text-slate-400'}`}>
                              {report.userId}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className={`p-4 border-t ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <button
                  onClick={() => setIsAdminReportDrawerOpen(false)}
                  className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 신고 및 건의하기 독립 팝업 모달 */}
        {isReportModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className={`rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl border ${
              isDarkMode ? 'bg-slate-900 border-slate-600 text-slate-100' : 'bg-white border-slate-100 text-slate-900'
            } ${isLargeFont ? 'text-sm' : 'text-xs'}`}>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/20">
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <Siren size={18} className="text-rose-600" /> 신고 및 건의하기
                </h3>
                <button onClick={() => setIsReportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSendReport} className="space-y-3.5">
                <div>
                  <label className="block font-bold mb-1.5">카테고리 선택</label>
                  <select
                    value={reportForm.category}
                    onChange={(e) => setReportForm({ ...reportForm, category: e.target.value })}
                    className={`w-full border p-3 rounded-xl focus:outline-none font-semibold ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="장애/오류 신고">장애/오류 신고</option>
                    <option value="이용제한">이용제한 문의</option>
                    <option value="개선사항 건의">개선사항 건의</option>
                    <option value="기타">기타</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1.5">제목</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    placeholder="제목을 입력해 주세요"
                    value={reportForm.title}
                    onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                    className={`w-full border p-3 rounded-xl focus:outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block font-bold">상세 내용</label>
                    <span className={`font-bold ${reportForm.content.length >= 1000 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {reportForm.content.length} / 1000자
                    </span>
                  </div>
                  <textarea
                    required
                    rows={5}
                    maxLength={1000}
                    placeholder="운영진에게 전달할 내용을 작성해 주세요."
                    value={reportForm.content}
                    onChange={(e) => setReportForm({ ...reportForm, content: e.target.value })}
                    className={`w-full border p-3 rounded-xl focus:outline-none leading-relaxed resize-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  ></textarea>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Send size={15} /> 제출하기
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 내 정보 수정 및 비밀번호 변경 모달 */}
        {isEditProfileOpen && currentUser && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className={`rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl border ${
              isDarkMode ? 'bg-slate-900 border-slate-600 text-slate-100' : 'bg-white border-slate-100 text-slate-900'
            } ${isLargeFont ? 'text-sm' : 'text-xs'}`}>
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <User size={18} /> 내 정보 / 비밀번호 변경
              </h3>

              <form onSubmit={handleSaveProfile} className="space-y-3.5">
                <div>
                  <label className="font-bold block mb-1 text-slate-400">아이디 (LDAP)</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.userId}
                    className="w-full border border-slate-300/40 p-2.5 rounded-xl bg-slate-100 text-slate-500 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">이메일</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.email}
                    className="w-full border border-slate-300/40 p-2.5 rounded-xl bg-slate-100 text-slate-500"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">이름</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={`w-full border p-2.5 rounded-xl focus:outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50/50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="pt-2 border-t border-slate-200/20 space-y-2">
                  <label className="font-bold block text-slate-400">비밀번호 변경 (선택)</label>
                  <input
                    type="password"
                    placeholder="새 비밀번호 입력 (변경 시에만 작성)"
                    value={changePassword}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className={`w-full border p-2.5 rounded-xl focus:outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50/50 border-slate-300 text-slate-900'
                    }`}
                  />
                  <input
                    type="password"
                    placeholder="새 비밀번호 재입력"
                    value={changePasswordConfirm}
                    onChange={(e) => setNewPasswordConfirmInput(e.target.value)}
                    className={`w-full border p-2.5 rounded-xl focus:outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50/50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditProfileOpen(false)}
                    className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition"
                  >
                    저장하기
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 장바구니 Drawer 모달 */}
        {isCartOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end" onClick={() => setIsCartOpen(false)}>
            <div 
              className={`w-full max-w-xs h-full flex flex-col shadow-2xl transition-colors ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'} ${isLargeFont ? 'text-sm' : 'text-xs'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 bg-[#FEE500] text-slate-900 flex justify-between items-center font-bold text-sm">
                <span>장바구니 ({cart.length} / 3)</span>
                <button onClick={() => setIsCartOpen(false)}><X size={18} /></button>
              </div>

              <div className={`p-4 border-b space-y-2 ${isDarkMode ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-200/80'}`}>
                <div className="flex justify-between items-center font-bold">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} /> 대여 기간 설정
                  </span>
                  <span className="font-extrabold bg-amber-300/60 text-slate-900 px-2 py-0.5 rounded-md text-[11px]">
                    {rentalDays}일 선택
                  </span>
                </div>
                
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
                  {Array.from({ length: 14 }, (_, i) => i + 1).map((days) => (
                    <button
                      key={days}
                      onClick={() => setRentalDays(days)}
                      className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                        rentalDays === days
                          ? 'bg-slate-900 text-white shadow-sm scale-105'
                          : isDarkMode
                          ? 'bg-slate-800 text-slate-300 border border-slate-700'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {days}일
                    </button>
                  ))}
                </div>

                <div className="text-slate-400 font-medium flex justify-between items-center pt-0.5">
                  <span>반납 예정일:</span>
                  <strong className={isDarkMode ? 'text-slate-100 font-extrabold' : 'text-slate-900 font-extrabold'}>{calculatedCalculatedEndDate()}</strong>
                </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-2">
                {cart.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 font-medium">담긴 게임이 없습니다.</div>
                ) : (
                  cart.map((game) => (
                    <div key={game.gameId} className={`flex justify-between items-center border p-3 rounded-xl shadow-sm ${
                      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200/80'
                    }`}>
                      <div>
                        <h4 className={`font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{game.title}</h4>
                        <p className="text-slate-400 mt-0.5">{game.minPlayers}~{game.maxPlayers}인 | {game.playTime}분</p>
                      </div>
                      <button onClick={() => removeFromCart(game.gameId)} className="text-slate-400 hover:text-rose-600 p-1"><Trash2 size={15} /></button>
                    </div>
                  ))
                )}
              </div>

              <div className={`p-4 border-t ${isDarkMode ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                {cart.length > 0 ? (
                  <button onClick={processCheckout} className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition shadow-sm">
                    선택한 게임 {rentalDays}일간 대여하기
                  </button>
                ) : (
                  <button onClick={() => setIsCartOpen(false)} className="w-full bg-slate-200 text-slate-700 py-3.5 rounded-xl font-bold hover:bg-slate-300 transition shadow-sm">
                    닫기
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 공지사항 우측 슬라이딩 Drawer 모달 */}
        {isNoticeDrawerOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end" onClick={() => setIsNoticeDrawerOpen(false)}>
            <div 
              className={`w-full max-w-xs h-full flex flex-col shadow-2xl transition-colors ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'} ${isLargeFont ? 'text-sm' : 'text-xs'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 bg-slate-900 flex justify-between items-center font-bold text-white text-sm">
                <span className="flex items-center gap-2">
                  <Bell size={16} className="text-[#FEE500]" /> 공지사항 목록
                </span>
                <button onClick={() => setIsNoticeDrawerOpen(false)} className="text-slate-300 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {selectedNotice && (
                  <div className={`p-4 rounded-2xl space-y-2 border shadow-sm ${
                    isDarkMode ? 'bg-slate-800 border-amber-500/40' : 'bg-amber-50/80 border-amber-300/80'
                  }`}>
                    <span className="text-amber-800 font-extrabold bg-amber-200/80 px-2 py-0.5 rounded-md inline-block">
                      선택한 공지사항
                    </span>
                    <h3 className={`font-extrabold leading-snug ${isDarkMode ? 'text-amber-300' : 'text-slate-900'}`}>{selectedNotice.title}</h3>
                    <p className={`whitespace-pre-wrap leading-relaxed pt-1 border-t ${
                      isDarkMode ? 'text-slate-300 border-slate-700' : 'text-slate-700 border-amber-200/60'
                    }`}>
                      {selectedNotice.content}
                    </p>
                    <span className="text-slate-400 block text-right pt-0.5">{selectedNotice.createdAt}</span>
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  <h4 className="font-bold text-slate-400 px-0.5">전체 공지 목록 ({notices.length})</h4>
                  {notices.map((notice) => {
                    const isSelected = selectedNotice?.noticeId === notice.noticeId;
                    return (
                      <div
                        key={notice.noticeId}
                        onClick={() => setSelectedNotice(notice)}
                        className={`p-3 rounded-xl border cursor-pointer transition ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900 text-white font-bold shadow-sm'
                            : isDarkMode
                            ? 'border-slate-800 bg-slate-800/60 text-slate-200 hover:border-slate-700'
                            : 'border-slate-200/80 bg-white text-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="truncate pr-2 font-semibold">{notice.title}</span>
                          <span className={`font-mono flex-shrink-0 ${isSelected ? 'text-amber-300' : 'text-slate-400'}`}>
                            {notice.createdAt.substring(5)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`p-4 border-t ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <button
                  onClick={() => setIsNoticeDrawerOpen(false)}
                  className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 게임 등록/수정 모달 */}
        {isGameModalOpen && editingGame && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className={`rounded-2xl w-full max-w-sm p-5 space-y-3.5 max-h-[90vh] overflow-y-auto shadow-2xl border ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-900'
            } ${isLargeFont ? 'text-sm' : 'text-xs'}`}>
              <h3 className="font-extrabold text-base">{isEditingMode ? '게임 정보 수정' : '신규 게임 등록'}</h3>
              <form onSubmit={saveGame} className="space-y-3">
                
                <div>
                  <label className="font-bold block mb-1.5 flex items-center gap-1">
                    <ImageIcon size={13} /> 이미지 URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={editingGame.imageUrl}
                    onChange={(e) => setEditingGame({ ...editingGame, imageUrl: e.target.value })}
                    className={`w-full border p-3 rounded-xl focus:outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50/50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1.5">보드게임 ID</label>
                  <input
                    type="text"
                    required
                    disabled={isEditingMode}
                    placeholder="예: KG0001"
                    value={editingGame.gameId}
                    onChange={(e) => setEditingGame({ ...editingGame, gameId: e.target.value })}
                    className={`w-full border p-3 rounded-xl ${
                      isEditingMode ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed' : isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50/50 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1.5">게임명</label>
                  <input
                    type="text"
                    required
                    placeholder="보드게임 이름"
                    value={editingGame.title}
                    onChange={(e) => setEditingGame({ ...editingGame, title: e.target.value })}
                    className={`w-full border p-3 rounded-xl focus:outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50/50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold block mb-1.5 flex items-center gap-1">
                      <CalendarDays size={13} /> 출시년도
                    </label>
                    <input
                      type="number"
                      required
                      min={1900}
                      max={2030}
                      value={editingGame.releaseYear}
                      onChange={(e) => setEditingGame({ ...editingGame, releaseYear: Number(e.target.value) })}
                      className={`w-full border p-3 rounded-xl ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50/50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1.5 flex items-center gap-1">
                      <BggIcon size={13} className="text-slate-400" /> BGG 평점
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      min={1.0}
                      max={10.0}
                      value={editingGame.bggRating}
                      onChange={(e) => setEditingGame({ ...editingGame, bggRating: Number(e.target.value) })}
                      className={`w-full border p-3 rounded-xl ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50/50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold block mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1"><Tag size={13} /> 장르 선택 (최대 3개)</span>
                    <span className="text-amber-500 font-extrabold">{editingGame.genres.length} / 3 개</span>
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
                          className={`px-2.5 py-1 rounded-full font-bold transition ${
                            isSelected ? 'bg-slate-900 text-white' : isMaxReached ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                      placeholder={editingGame.genres.length >= 3 ? "최대 3개 선택 완료" : "기타 장르 입력"}
                      value={customGenreInput}
                      onChange={(e) => setCustomGenreInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomGenre();
                        }
                      }}
                      className={`flex-1 border p-2.5 rounded-xl ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50/50 border-slate-300 text-slate-900'
                      }`}
                    />
                    <button
                      type="button"
                      disabled={editingGame.genres.length >= 3}
                      onClick={handleAddCustomGenre}
                      className="bg-slate-800 text-white px-3.5 rounded-xl font-bold disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                      추가
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold block mb-1.5">최소인원 (명)</label>
                    <input
                      type="number"
                      min={1}
                      value={editingGame.minPlayers}
                      onChange={(e) => setEditingGame({ ...editingGame, minPlayers: Number(e.target.value) })}
                      className={`w-full border p-3 rounded-xl ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50/50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1.5">최대인원 (명)</label>
                    <input
                      type="number"
                      min={1}
                      value={editingGame.maxPlayers}
                      onChange={(e) => setEditingGame({ ...editingGame, maxPlayers: Number(e.target.value) })}
                      className={`w-full border p-3 rounded-xl ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50/50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold block mb-1.5">플레이타임 (분)</label>
                    <input
                      type="number"
                      min={1}
                      value={editingGame.playTime}
                      onChange={(e) => setEditingGame({ ...editingGame, playTime: Number(e.target.value) })}
                      className={`w-full border p-3 rounded-xl ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50/50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1.5 flex items-center gap-1">
                      <Brain size={13} className="text-slate-400" /> 난이도 (1.00~5.00)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={1.00}
                      max={5.00}
                      value={editingGame.difficulty}
                      onChange={(e) => setEditingGame({ ...editingGame, difficulty: Number(e.target.value) })}
                      className={`w-full border p-3 rounded-xl ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50/50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold block mb-1.5">노출 여부</label>
                  <select
                    value={editingGame.isVisible}
                    onChange={(e) => setEditingGame({ ...editingGame, isVisible: e.target.value as 'Y' | 'N' })}
                    className={`w-full border p-3 rounded-xl ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50/50 border-slate-300 text-slate-900'
                    }`}
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

        {/* 공지사항 작성 모달 */}
        {isNoticeModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className={`rounded-2xl w-full max-w-sm p-5 space-y-3.5 shadow-2xl border ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-900'
            } ${isLargeFont ? 'text-sm' : 'text-xs'}`}>
              <h3 className="font-extrabold text-base">{editingNotice.id ? '공지사항 수정' : '공지사항 작성'}</h3>
              <form onSubmit={saveNotice} className="space-y-3">
                <div>
                  <label className="font-bold block mb-1.5">공지 제목</label>
                  <input
                    type="text"
                    required
                    placeholder="공지 제목을 입력하세요"
                    value={editingNotice.title}
                    onChange={(e) => setEditingNotice({ ...editingNotice, title: e.target.value })}
                    className={`w-full border p-3 rounded-xl focus:outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50/50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1.5">공지 내용</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="공지할 내용을 상세히 작성하세요"
                    value={editingNotice.content}
                    onChange={(e) => setEditingNotice({ ...editingNotice, content: e.target.value })}
                    className={`w-full border p-3 rounded-xl focus:outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50/50 border-slate-300 text-slate-900'
                    }`}
                  ></textarea>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setIsNoticeModalOpen(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold text-slate-700 hover:bg-slate-200 transition">취소</button>
                  <button type="submit" className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition">저장</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}