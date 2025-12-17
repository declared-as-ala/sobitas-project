import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { GeneralService } from '../../apis/general.service';
import { CommonModule } from '@angular/common';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs/breadcrumbs.component';
import { ArticleComponent } from '../../shared/article/article.component';

@Component({
  selector: 'app-blogs',
  templateUrl: './blogs.component.html',
  styleUrls: ['./blogs.component.css'],
  imports: [CommonModule,BreadcrumbsComponent,ArticleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlogsComponent implements OnInit {

  constructor(private general : GeneralService, private cdr : ChangeDetectorRef){}

  articles : any = []
  ngOnInit(): void {
      this.general.articles()
      .subscribe((data : any)=>{
        this.articles = data
      })
      this.cdr.markForCheck();
  }
}
