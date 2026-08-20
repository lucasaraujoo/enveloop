export function getFirebaseErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'E-mail ou senha incorretos.';
    case 'auth/invalid-email':
      return 'E-mail inválido.';
    case 'auth/user-disabled':
      return 'Este usuário foi desativado.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está em uso.';
    case 'auth/operation-not-allowed':
      return 'Operação não permitida.';
    case 'auth/weak-password':
      return 'A senha é muito fraca.';
    case 'auth/network-request-failed':
      return 'Falha na conexão. Verifique sua internet.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas de login. Tente novamente mais tarde.';
    default:
      return 'Ocorreu um erro inesperado. Tente novamente. Erro: ' + errorCode;
  }
}
