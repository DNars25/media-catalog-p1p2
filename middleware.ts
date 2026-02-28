import { withAuth } from 'next-auth/middleware'

// Protege SOMENTE as rotas do dashboard.
// Tudo fora do matcher (incluindo /vitrine e as APIs públicas) permanece acessível sem autenticação.
export default withAuth({
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: ['/dashboard/:path*'],
}
