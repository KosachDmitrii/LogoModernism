import { SetMetadata } from '@nestjs/common';

export const AUTHENTICATED_ONLY_ROUTE = 'authenticatedOnlyRoute';
export const AuthenticatedOnly = () => SetMetadata(AUTHENTICATED_ONLY_ROUTE, true);
