import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { ShareButtons } from 'ngx-sharebuttons/buttons';

@Component({
  selector: 'app-social-share',
  templateUrl: './social-share.component.html',
  styleUrls: ['./social-share.component.css'],
  imports: [ShareButtons]
})
export class SocialShareComponent {



  @Input() description : any;

  url : any
  constructor(private router : Router){
    this.url = this.router.url;
  }
}
