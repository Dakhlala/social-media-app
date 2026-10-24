import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, AuthData } from '../../models/api.models';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly httpClient = inject(HttpClient);

  signUp(data: object): Observable<ApiResponse<AuthData>> {
    return this.httpClient.post<ApiResponse<AuthData>>(`${environment.baseUrl}/users/signup`, data);
  }

  signIn(data: object): Observable<ApiResponse<AuthData>> {
    return this.httpClient.post<ApiResponse<AuthData>>(`${environment.baseUrl}/users/signin`, data);
  }
}
