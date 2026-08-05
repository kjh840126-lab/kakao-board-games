export type Role = '일반회원' | '운영자';
export type GameStatus = '대여가능' | '대여중' | '대여불가';
export type RentalStatus = '대여중' | '반납완료';

export interface User {
  userId: string;
  name: string;
  email: string;
  role: Role;
  penaltyPoints: number;
  penaltyEndDate: string | null; // YYYY-MM-DD
  createdAt: string;
  lastLoginAt: string;
}

export interface Game {
  gameId: string;
  title: string;
  status: GameStatus;
  minPlayers: number;
  maxPlayers: number;
  playTime: number; // 분 단위
  difficulty: number;
  imageUrl: string;
  description: string;
  isVisible: 'Y' | 'N';
  genres: string[];
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